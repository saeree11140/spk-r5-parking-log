import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, describe, expect, it } from "vitest";

import { ApiError } from "./api-error";
import { apiClient, authRefreshClient } from "./client";

const originalRefreshAdapter = authRefreshClient.defaults.adapter;

function success(
  config: InternalAxiosRequestConfig,
  data: unknown = {},
): AxiosResponse {
  return {
    config,
    data,
    headers: {},
    status: 200,
    statusText: "OK",
  };
}

function rejectWith(error: AxiosError) {
  return async () => Promise.reject(error);
}

function makeConfig(): InternalAxiosRequestConfig {
  return { headers: new AxiosHeaders() };
}

describe("apiClient", () => {
  afterEach(() => {
    authRefreshClient.defaults.adapter = originalRefreshAdapter;
    document.cookie =
      "spk_r5_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("uses the configured API URL and ten-second timeout", () => {
    expect(apiClient.defaults.baseURL).toBe("http://localhost:3001/api");
    expect(apiClient.defaults.timeout).toBe(10_000);
  });

  it("normalizes a backend domain error", async () => {
    const config = makeConfig();
    const response = {
      config,
      data: {
        code: "HOUSE_NOT_FOUND",
        message: "House not found",
        statusCode: 404,
      },
      headers: {},
      status: 404,
      statusText: "Not Found",
    };
    const error = new AxiosError(
      "Request failed",
      "ERR_BAD_REQUEST",
      config,
      undefined,
      response,
    );

    await expect(
      apiClient.get("/domain", { adapter: rejectWith(error) }),
    ).rejects.toEqual(new ApiError("House not found", "HOUSE_NOT_FOUND", 404));
  });

  it("normalizes a timeout without exposing transport details", async () => {
    const error = new AxiosError(
      "socket internals",
      "ECONNABORTED",
      makeConfig(),
    );

    await expect(
      apiClient.get("/timeout", { adapter: rejectWith(error) }),
    ).rejects.toMatchObject({
      code: "TIMEOUT",
      message: "การเชื่อมต่อใช้เวลานานเกินไป",
      statusCode: null,
    });
  });

  it("normalizes a network failure without exposing transport details", async () => {
    const error = new AxiosError(
      "getaddrinfo ENOTFOUND internal-host",
      "ERR_NETWORK",
      makeConfig(),
    );

    await expect(
      apiClient.get("/network", { adapter: rejectWith(error) }),
    ).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
      statusCode: null,
    });
  });

  it("normalizes malformed server errors as unknown", async () => {
    const config = makeConfig();
    const error = new AxiosError(
      "internal secret",
      "ERR_BAD_RESPONSE",
      config,
      undefined,
      {
        config,
        data: { message: "missing contract fields" },
        headers: {},
        status: 500,
        statusText: "Server Error",
      },
    );

    await expect(
      apiClient.get("/unknown", { adapter: rejectWith(error) }),
    ).rejects.toMatchObject({
      code: "UNKNOWN_ERROR",
      message: "เกิดข้อผิดพลาด กรุณาลองใหม่",
      statusCode: null,
    });
  });

  it("sends credentials and CSRF header for mutations", async () => {
    document.cookie = "spk_r5_csrf=csrf-token; path=/";
    const captured: InternalAxiosRequestConfig[] = [];

    await apiClient.post(
      "/auth/logout",
      {},
      {
        adapter: async (config) => {
          captured.push(config);
          return success(config);
        },
      },
    );

    expect(apiClient.defaults.withCredentials).toBe(true);
    expect(captured[0]?.headers.get("X-CSRF-Token")).toBe("csrf-token");
  });

  it("uses one refresh for concurrent 401s and retries each request once", async () => {
    document.cookie = "spk_r5_csrf=csrf-token; path=/";
    let refreshCount = 0;
    const counts = new Map<string, number>();
    authRefreshClient.defaults.adapter = async (config) => {
      refreshCount += 1;
      return success(config);
    };
    const adapter = async (config: InternalAxiosRequestConfig) => {
      const url = config.url ?? "";
      const count = (counts.get(url) ?? 0) + 1;
      counts.set(url, count);
      if (count === 1) {
        throw new AxiosError(
          "Authentication required",
          "ERR_BAD_REQUEST",
          config,
          undefined,
          {
            config,
            data: {
              statusCode: 401,
              code: "AUTH_REQUIRED",
              message: "Authentication required",
            },
            headers: {},
            status: 401,
            statusText: "Unauthorized",
          },
        );
      }
      return success(config);
    };

    await Promise.all([
      apiClient.get("/houses", { adapter }),
      apiClient.get("/auth/me", { adapter }),
    ]);

    expect(refreshCount).toBe(1);
    expect(counts.get("/houses")).toBe(2);
    expect(counts.get("/auth/me")).toBe(2);
  });
});

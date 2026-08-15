import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error";
import {
  apiClient,
  authRefreshClient,
  registerAuthExpiredHandler,
  runWithAuthRefreshLock,
} from "./client";

const originalRefreshAdapter = authRefreshClient.defaults.adapter;
const originalApiAdapter = apiClient.defaults.adapter;
const originalLocks = navigator.locks;

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
    apiClient.defaults.adapter = originalApiAdapter;
    authRefreshClient.defaults.adapter = originalRefreshAdapter;
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: originalLocks,
    });
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

  it("renews a stale CSRF cookie and retries a mutation once", async () => {
    document.cookie = "spk_r5_csrf=stale-token; path=/";
    const requests: Array<{ csrf: unknown; method: string; url: string }> = [];
    let mutationAttempts = 0;

    apiClient.defaults.adapter = async (config) => {
      requests.push({
        csrf: config.headers.get("X-CSRF-Token"),
        method: config.method ?? "",
        url: config.url ?? "",
      });

      if (config.url === "/auth/csrf") {
        document.cookie = "spk_r5_csrf=renewed-token; path=/";
        return success(config, { success: true });
      }

      mutationAttempts += 1;
      if (mutationAttempts === 1) {
        throw new AxiosError(
          "CSRF validation failed",
          "ERR_BAD_REQUEST",
          config,
          undefined,
          {
            config,
            data: {
              code: "CSRF_INVALID",
              message: "CSRF validation failed",
              statusCode: 403,
            },
            headers: {},
            status: 403,
            statusText: "Forbidden",
          },
        );
      }

      return success(config, { violation: { id: "violation-002" } });
    };

    await expect(
      apiClient.post("/houses/R5-055/violations", {}),
    ).resolves.toMatchObject({
      data: { violation: { id: "violation-002" } },
    });
    expect(requests).toEqual([
      {
        csrf: "stale-token",
        method: "post",
        url: "/houses/R5-055/violations",
      },
      { csrf: undefined, method: "get", url: "/auth/csrf" },
      {
        csrf: "renewed-token",
        method: "post",
        url: "/houses/R5-055/violations",
      },
    ]);
  });

  it("preserves a business error returned after CSRF recovery", async () => {
    document.cookie = "spk_r5_csrf=stale-token; path=/";
    const onAuthExpired = vi.fn();
    const unregister = registerAuthExpiredHandler(onAuthExpired);
    let mutationAttempts = 0;

    apiClient.defaults.adapter = async (config) => {
      if (config.url === "/auth/csrf") {
        document.cookie = "spk_r5_csrf=renewed-token; path=/";
        return success(config, { success: true });
      }

      mutationAttempts += 1;
      const data =
        mutationAttempts === 1
          ? {
              code: "CSRF_INVALID",
              message: "CSRF validation failed",
              statusCode: 403,
            }
          : {
              code: "CYCLE_CLOSED",
              message: "Cycle is closed",
              statusCode: 409,
            };
      throw new AxiosError(
        data.message,
        "ERR_BAD_REQUEST",
        config,
        undefined,
        {
          config,
          data,
          headers: {},
          status: data.statusCode,
          statusText: "Request failed",
        },
      );
    };

    try {
      await expect(
        apiClient.post("/houses/R5-055/violations", {}),
      ).rejects.toMatchObject({
        code: "CYCLE_CLOSED",
        message: "Cycle is closed",
        statusCode: 409,
      });
      expect(onAuthExpired).not.toHaveBeenCalled();
    } finally {
      unregister();
    }
  });

  it("uses one refresh for concurrent 401s and retries each request once", async () => {
    document.cookie = "spk_r5_csrf=csrf-token; path=/";
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: {
        request: async (_name: string, callback: () => Promise<void>) =>
          callback(),
      },
    });
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

  it("coordinates refresh rotation through a cross-tab Web Lock", async () => {
    const request = vi.fn(
      async (_name: string, callback: () => Promise<void>) => callback(),
    );
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request },
    });
    authRefreshClient.defaults.adapter = async (config) => success(config);
    let attempts = 0;
    const adapter = async (config: InternalAxiosRequestConfig) => {
      attempts += 1;
      if (attempts === 1) {
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

    await apiClient.get("/houses", { adapter });

    expect(request).toHaveBeenCalledWith(
      "spk-r5-auth-refresh",
      expect.any(Function),
    );
  });

  it("serializes two independent refresh contexts with the same lock", async () => {
    let tail = Promise.resolve();
    const request = vi.fn(
      <T>(_name: string, callback: () => Promise<T>): Promise<T> => {
        const result = tail.then(callback);
        tail = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      },
    );
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request },
    });
    let active = 0;
    let maximumActive = 0;
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const operation = async (wait: boolean) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      if (wait) await firstGate;
      active -= 1;
    };

    const first = runWithAuthRefreshLock(() => operation(true));
    await vi.waitFor(() => expect(active).toBe(1));
    const second = runWithAuthRefreshLock(() => operation(false));
    await Promise.resolve();

    expect(active).toBe(1);
    releaseFirst();
    await Promise.all([first, second]);
    expect(maximumActive).toBe(1);
    expect(request).toHaveBeenCalledTimes(2);
    expect(
      request.mock.calls.every(([name]) => name === "spk-r5-auth-refresh"),
    ).toBe(true);
  });

  it("fails safe instead of refreshing without cross-tab coordination", async () => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: undefined,
    });
    const refresh = vi.fn(async () => undefined);

    await expect(runWithAuthRefreshLock(refresh)).rejects.toMatchObject({
      code: "AUTH_REFRESH_COORDINATION_UNAVAILABLE",
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});

import {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios";
import { describe, expect, it } from "vitest";

import { ApiError } from "./api-error";
import { apiClient } from "./client";

function rejectWith(error: AxiosError) {
  return async () => Promise.reject(error);
}

function makeConfig(): InternalAxiosRequestConfig {
  return { headers: new AxiosHeaders() };
}

describe("apiClient", () => {
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
    ).rejects.toEqual(
      new ApiError("House not found", "HOUSE_NOT_FOUND", 404),
    );
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
});

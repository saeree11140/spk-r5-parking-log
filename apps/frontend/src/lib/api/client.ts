import type { ApiErrorResponse } from "@spk-r5-parking-log/shared-types";
import axios, { AxiosError } from "axios";

import { ApiError } from "./api-error";

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.statusCode === "number" &&
    typeof candidate.code === "string" &&
    typeof candidate.message === "string"
  );
}

function normalizeError(error: unknown): ApiError {
  if (!(error instanceof AxiosError)) {
    return new ApiError(
      "เกิดข้อผิดพลาด กรุณาลองใหม่",
      "UNKNOWN_ERROR",
      null,
    );
  }

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return new ApiError(
      "การเชื่อมต่อใช้เวลานานเกินไป",
      "TIMEOUT",
      null,
    );
  }

  if (isApiErrorResponse(error.response?.data)) {
    const { code, message, statusCode } = error.response.data;
    return new ApiError(message, code, statusCode);
  }

  if (!error.response || error.code === "ERR_NETWORK") {
    return new ApiError(
      "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
      "NETWORK_ERROR",
      null,
    );
  }

  return new ApiError("เกิดข้อผิดพลาด กรุณาลองใหม่", "UNKNOWN_ERROR", null);
}

export const apiClient = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeError(error)),
);

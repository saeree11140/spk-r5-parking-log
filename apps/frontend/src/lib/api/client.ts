import type { ApiErrorResponse } from "@spk-r5-parking-log/shared-types";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { ApiError } from "./api-error";
import { readCsrfCookie } from "./csrf";

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _authRetried?: boolean;
  _csrfRetried?: boolean;
}

type AuthExpiredHandler = () => void;

const MUTATION_METHODS = new Set(["post", "patch", "put", "delete"]);
let refreshPromise: Promise<void> | null = null;
let csrfRecoveryPromise: Promise<void> | null = null;
let authExpiredHandler: AuthExpiredHandler | null = null;

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
    return new ApiError("เกิดข้อผิดพลาด กรุณาลองใหม่", "UNKNOWN_ERROR", null);
  }

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return new ApiError("การเชื่อมต่อใช้เวลานานเกินไป", "TIMEOUT", null);
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
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000,
  withCredentials: true,
});

export const authRefreshClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000,
  withCredentials: true,
});

function addCsrfHeader(
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig {
  if (MUTATION_METHODS.has(config.method?.toLowerCase() ?? "")) {
    const csrfToken = readCsrfCookie();
    if (csrfToken) config.headers.set("X-CSRF-Token", csrfToken);
  }
  return config;
}

apiClient.interceptors.request.use(addCsrfHeader);
authRefreshClient.interceptors.request.use(addCsrfHeader);

export function registerAuthExpiredHandler(
  handler: AuthExpiredHandler,
): () => void {
  authExpiredHandler = handler;
  return () => {
    if (authExpiredHandler === handler) authExpiredHandler = null;
  };
}

function shouldRefresh(error: unknown): error is AxiosError<ApiErrorResponse> {
  if (!(error instanceof AxiosError)) return false;

  const config = error.config as RetriableRequestConfig | undefined;
  const url = config?.url ?? "";
  return (
    error.response?.status === 401 &&
    error.response.data?.code === "AUTH_REQUIRED" &&
    !config?._authRetried &&
    !url.endsWith("/auth/login") &&
    !url.endsWith("/auth/refresh")
  );
}

function shouldRecoverCsrf(
  error: unknown,
): error is AxiosError<ApiErrorResponse> {
  if (!(error instanceof AxiosError)) return false;

  const config = error.config as RetriableRequestConfig | undefined;
  return (
    error.response?.status === 403 &&
    error.response.data?.code === "CSRF_INVALID" &&
    !config?._csrfRetried
  );
}

async function recoverCsrf(): Promise<void> {
  await apiClient.get("/auth/csrf");
}

export async function runWithAuthRefreshLock(
  operation: () => Promise<void>,
): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.locks) {
    throw new ApiError(
      "เบราว์เซอร์นี้ไม่รองรับการต่ออายุ Session อย่างปลอดภัย",
      "AUTH_REFRESH_COORDINATION_UNAVAILABLE",
      null,
    );
  }

  await navigator.locks.request("spk-r5-auth-refresh", operation);
}

async function refreshAuthentication(): Promise<void> {
  await runWithAuthRefreshLock(async () => {
    await authRefreshClient.post("/auth/refresh", {});
  });
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (shouldRecoverCsrf(error)) {
      const config = error.config as RetriableRequestConfig;
      config._csrfRetried = true;

      csrfRecoveryPromise ??= recoverCsrf().finally(() => {
        csrfRecoveryPromise = null;
      });

      try {
        await csrfRecoveryPromise;
      } catch (recoveryError) {
        authExpiredHandler?.();
        return Promise.reject(normalizeError(recoveryError));
      }

      return apiClient.request(config);
    }

    if (!shouldRefresh(error)) {
      return Promise.reject(normalizeError(error));
    }

    const config = error.config as RetriableRequestConfig;
    config._authRetried = true;

    refreshPromise ??= refreshAuthentication().finally(() => {
      refreshPromise = null;
    });

    try {
      await refreshPromise;
      return await apiClient.request(config);
    } catch (refreshError) {
      authExpiredHandler?.();
      return Promise.reject(normalizeError(refreshError));
    }
  },
);

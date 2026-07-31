import type {
  AuthResponse,
  AuthUser,
  ChangePasswordInput,
  LoginInput,
  LogoutResponse,
} from "@spk-r5-parking-log/shared-types";

import { apiClient } from "./client";

export const authApi = {
  async login(input: LoginInput): Promise<AuthUser> {
    const response = await apiClient.post<AuthResponse>("/auth/login", input);
    return response.data.user;
  },

  async refresh(): Promise<AuthUser> {
    const response = await apiClient.post<AuthResponse>("/auth/refresh", {});
    return response.data.user;
  },

  async logout(): Promise<LogoutResponse> {
    const response = await apiClient.post<LogoutResponse>("/auth/logout", {});
    return response.data;
  },

  async me(): Promise<AuthUser> {
    const response = await apiClient.get<AuthResponse>("/auth/me");
    return response.data.user;
  },

  async changePassword(input: ChangePasswordInput): Promise<AuthUser> {
    const response = await apiClient.post<AuthResponse>(
      "/auth/change-password",
      input,
    );
    return response.data.user;
  },
};

import type {
  CreateUserInput,
  ResetPasswordInput,
  UpdateUserInput,
  UserResponse,
  UsersResponse,
  UserSummary,
} from "@spk-r5-parking-log/shared-types";

import { apiClient } from "./client";

export const usersApi = {
  async list(): Promise<UserSummary[]> {
    const response = await apiClient.get<UsersResponse>("/users");
    return response.data.users;
  },

  async create(input: CreateUserInput): Promise<UserSummary> {
    const response = await apiClient.post<UserResponse>("/users", input);
    return response.data.user;
  },

  async update(userId: string, input: UpdateUserInput): Promise<UserSummary> {
    const response = await apiClient.patch<UserResponse>(
      `/users/${userId}`,
      input,
    );
    return response.data.user;
  },

  async resetPassword(
    userId: string,
    input: ResetPasswordInput,
  ): Promise<UserSummary> {
    const response = await apiClient.post<UserResponse>(
      `/users/${userId}/reset-password`,
      input,
    );
    return response.data.user;
  },
};

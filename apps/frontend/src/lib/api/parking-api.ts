import type {
  CancelViolationInput,
  CreateViolationInput,
  HouseDetail,
  HouseSummary,
  MarkFinePaidInput,
  MarkFinePaidResponse,
  ViolationMutationResponse,
} from "@spk-r5-parking-log/shared-types";

import { apiClient } from "./client";

function encodePath(value: string): string {
  return encodeURIComponent(value);
}

export const parkingApi = {
  async getHouses(): Promise<HouseSummary[]> {
    const response = await apiClient.get<HouseSummary[]>("/houses");
    return response.data;
  },

  async getHouse(houseCode: string): Promise<HouseDetail> {
    const response = await apiClient.get<HouseDetail>(
      `/houses/${encodePath(houseCode)}`,
    );
    return response.data;
  },

  async createViolation(
    houseCode: string,
    input: CreateViolationInput,
  ): Promise<ViolationMutationResponse> {
    const response = await apiClient.post<ViolationMutationResponse>(
      `/houses/${encodePath(houseCode)}/violations`,
      input,
    );
    return response.data;
  },

  async cancelViolation(
    houseCode: string,
    violationId: string,
    input: CancelViolationInput,
  ): Promise<ViolationMutationResponse> {
    const response = await apiClient.post<ViolationMutationResponse>(
      `/houses/${encodePath(houseCode)}/violations/${encodePath(
        violationId,
      )}/cancel`,
      input,
    );
    return response.data;
  },

  async markFinePaid(
    houseCode: string,
    violationId: string,
    input: MarkFinePaidInput,
  ): Promise<MarkFinePaidResponse> {
    const response = await apiClient.post<MarkFinePaidResponse>(
      `/houses/${encodePath(houseCode)}/violations/${encodePath(
        violationId,
      )}/mark-paid`,
      input,
    );
    return response.data;
  },
};

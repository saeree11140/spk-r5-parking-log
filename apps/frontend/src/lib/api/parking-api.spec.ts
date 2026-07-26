import type {
  HouseDetail,
  HouseSummary,
  MarkFinePaidResponse,
  ViolationMutationResponse,
} from "@spk-r5-parking-log/shared-types";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeHouseDetail, makeHouseSummary } from "@/test/fixtures";

import { apiClient } from "./client";
import { parkingApi } from "./parking-api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parkingApi", () => {
  it("loads all houses", async () => {
    const data: HouseSummary[] = [makeHouseSummary()];
    vi.spyOn(apiClient, "get").mockResolvedValue({ data });

    await expect(parkingApi.getHouses()).resolves.toEqual(data);
    expect(apiClient.get).toHaveBeenCalledWith("/houses");
  });

  it("loads one encoded house code", async () => {
    const data: HouseDetail = makeHouseDetail();
    vi.spyOn(apiClient, "get").mockResolvedValue({ data });

    await expect(parkingApi.getHouse("R5-001")).resolves.toEqual(data);
    expect(apiClient.get).toHaveBeenCalledWith("/houses/R5-001");
  });

  it("creates a violation with the API payload", async () => {
    const data = {} as ViolationMutationResponse;
    const input = { note: "กีดขวาง", occurredAt: "2026-07-01T03:00:00.000Z" };
    vi.spyOn(apiClient, "post").mockResolvedValue({ data });

    await expect(parkingApi.createViolation("R5-001", input)).resolves.toBe(
      data,
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      "/houses/R5-001/violations",
      input,
    );
  });

  it("cancels by violation ID rather than fine ID", async () => {
    const data = {} as ViolationMutationResponse;
    const input = { reason: "บันทึกผิดบ้าน" };
    vi.spyOn(apiClient, "post").mockResolvedValue({ data });

    await parkingApi.cancelViolation(
      "R5-001",
      "400815ca-caf9-4106-86f2-99895fa014fe",
      input,
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      "/houses/R5-001/violations/400815ca-caf9-4106-86f2-99895fa014fe/cancel",
      input,
    );
  });

  it("marks a violation fine paid without an amount payload", async () => {
    const data = {} as MarkFinePaidResponse;
    const input = {
      paidAt: "2026-07-01T03:00:00.000Z",
      reference: "receipt-001",
    };
    vi.spyOn(apiClient, "post").mockResolvedValue({ data });

    await parkingApi.markFinePaid(
      "R5-001",
      "400815ca-caf9-4106-86f2-99895fa014fe",
      input,
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      "/houses/R5-001/violations/400815ca-caf9-4106-86f2-99895fa014fe/mark-paid",
      input,
    );
    expect(input).not.toHaveProperty("amountBaht");
  });
});

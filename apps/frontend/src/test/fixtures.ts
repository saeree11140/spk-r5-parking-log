import type {
  AuthUser,
  CycleResponse,
  HouseDetail,
  HouseSummary,
  ViolationResponse,
} from "@spk-r5-parking-log/shared-types";

export function makeAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    username: "admin",
    displayName: "ผู้ดูแลระบบ",
    role: "ADMIN",
    isActive: true,
    mustChangePassword: false,
    ...overrides,
  };
}

export function makeHouseSummary(
  overrides: Partial<HouseSummary> = {},
): HouseSummary {
  return {
    actualHouseNumber: "99/1",
    code: "R5-001",
    currentCycle: null,
    id: "house-001",
    isActive: true,
    sequenceNumber: 1,
    ...overrides,
  };
}

export function makeViolation(
  overrides: Partial<ViolationResponse> = {},
): ViolationResponse {
  return {
    cancellationReason: null,
    cancelledAt: null,
    fine: null,
    id: "400815ca-caf9-4106-86f2-99895fa014fe",
    note: "ทดสอบ",
    occurredAt: "2026-07-01T03:00:00.000Z",
    sequenceNumber: 1,
    status: "WARNING",
    ...overrides,
  };
}

export function makeCycle(
  overrides: Partial<CycleResponse> = {},
): CycleResponse {
  return {
    closedAt: null,
    cycleNumber: 1,
    id: "cycle-001",
    openedAt: "2026-07-01T03:00:00.000Z",
    paidAmountBaht: 0,
    paidFineCount: 0,
    pendingAmountBaht: 0,
    pendingFineCount: 0,
    status: "OPEN",
    totalFineAmountBaht: 0,
    violationCount: 0,
    violations: [],
    ...overrides,
  };
}

export function makeHouseDetail(
  overrides: Partial<HouseDetail> = {},
): HouseDetail {
  return {
    actualHouseNumber: "99/1",
    code: "R5-001",
    cycles: [],
    id: "house-001",
    isActive: true,
    sequenceNumber: 1,
    ...overrides,
  };
}

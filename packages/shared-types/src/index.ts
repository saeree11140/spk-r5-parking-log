export type ViolationStatus = "WARNING" | "PENDING_FINE" | "PAID" | "CANCELLED";

export type FineStatus = "PENDING" | "PAID" | "CANCELLED";
export type CycleStatus = "OPEN" | "CLOSED";

export interface FineResponse {
  id: string;
  amountBaht: number;
  status: FineStatus;
  paidAt: string | null;
  reference: string | null;
}

export interface ViolationResponse {
  id: string;
  sequenceNumber: number | null;
  occurredAt: string;
  status: ViolationStatus;
  note: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  fine: FineResponse | null;
}

export interface CycleSummary {
  id: string;
  cycleNumber: number;
  violationCount: number;
  pendingFineCount: number;
  pendingAmountBaht: number;
}

export interface HouseSummary {
  id: string;
  code: string;
  sequenceNumber: number;
  actualHouseNumber: string | null;
  isActive: boolean;
  currentCycle: CycleSummary | null;
}

export interface CycleResponse extends CycleSummary {
  status: CycleStatus;
  openedAt: string;
  closedAt: string | null;
  totalFineAmountBaht: number;
  paidFineCount: number;
  paidAmountBaht: number;
  violations: ViolationResponse[];
}

export interface HouseDetail {
  id: string;
  code: string;
  sequenceNumber: number;
  actualHouseNumber: string | null;
  isActive: boolean;
  cycles: CycleResponse[];
}

export interface HealthCheckResponse {
  status: "ok";
  service: string;
}

export interface CreateViolationInput {
  occurredAt: string;
  note?: string;
}

export interface CancelViolationInput {
  reason: string;
}

export interface MarkFinePaidInput {
  paidAt: string;
  reference?: string;
}

export interface ViolationMutationResponse {
  violation: ViolationResponse;
  currentCycle: CycleSummary;
}

export interface MarkFinePaidResponse {
  fine: FineResponse;
  violation: ViolationResponse;
  cycleClosed: boolean;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
}

export type ViolationStatus = "WARNING" | "PENDING_FINE" | "PAID" | "CANCELLED";

export type FineStatus = "PENDING" | "PAID" | "CANCELLED";
export type CycleStatus = "OPEN" | "CLOSED";
export type UserRole = "ADMIN" | "STAFF";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface UserSummary extends AuthUser {
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CreateUserInput {
  username: string;
  displayName: string;
  role: UserRole;
  temporaryPassword: string;
}

export interface UpdateUserInput {
  displayName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface ResetPasswordInput {
  temporaryPassword: string;
}

export interface UsersResponse {
  users: UserSummary[];
}

export interface UserResponse {
  user: UserSummary;
}

export interface LogoutResponse {
  success: true;
}

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

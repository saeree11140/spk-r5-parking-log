export type ViolationStatus = "WARNING" | "PENDING_FINE" | "PAID" | "CANCELLED";

export interface HealthCheckResponse {
  status: "ok";
  service: string;
}

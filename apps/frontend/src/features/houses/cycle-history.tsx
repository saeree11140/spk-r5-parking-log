import type {
  CycleResponse,
  ViolationResponse,
} from "@spk-r5-parking-log/shared-types";

import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { formatBaht } from "@/features/dashboard/dashboard-summary";
import { formatThaiDateTime } from "@/lib/date-time";

interface CycleHistoryProps {
  cycles: CycleResponse[];
  onCancelViolation?: (violation: ViolationResponse) => void;
  onMarkPaid?: (violation: ViolationResponse) => void;
}

const violationLabels: Record<ViolationResponse["status"], string> = {
  CANCELLED: "ยกเลิก",
  PAID: "ชำระแล้ว",
  PENDING_FINE: "รอชำระ Fine",
  WARNING: "แจ้งเตือน",
};

const violationTones: Record<ViolationResponse["status"], StatusTone> = {
  CANCELLED: "neutral",
  PAID: "success",
  PENDING_FINE: "warning",
  WARNING: "info",
};

function orderViolations(
  violations: ViolationResponse[],
): ViolationResponse[] {
  return [...violations].sort((left, right) => {
    const leftCancelled = left.status === "CANCELLED";
    const rightCancelled = right.status === "CANCELLED";
    if (leftCancelled !== rightCancelled) return leftCancelled ? 1 : -1;
    return (
      (left.sequenceNumber ?? Number.MAX_SAFE_INTEGER) -
      (right.sequenceNumber ?? Number.MAX_SAFE_INTEGER)
    );
  });
}

export function CycleHistory({
  cycles,
  onCancelViolation,
  onMarkPaid,
}: CycleHistoryProps) {
  const sortedCycles = [...cycles].sort(
    (left, right) => right.cycleNumber - left.cycleNumber,
  );

  return (
    <section className="history-stack">
      <h2>ประวัติ Cycle</h2>
      {sortedCycles.map((cycle) => {
        const cancellationAllowed =
          cycle.status === "OPEN" && cycle.paidFineCount === 0;

        return (
          <article
            aria-label={`Cycle ${cycle.cycleNumber}`}
            className="cycle-card"
            key={cycle.id}
            role="region"
          >
            <header className="cycle-header">
              <div>
                <h2>Cycle {cycle.cycleNumber}</h2>
                <p>
                  เปิด {formatThaiDateTime(cycle.openedAt)}
                  {cycle.closedAt
                    ? ` · ปิด ${formatThaiDateTime(cycle.closedAt)}`
                    : ""}
                </p>
              </div>
              <StatusBadge tone={cycle.status === "OPEN" ? "info" : "success"}>
                {cycle.status === "OPEN" ? "กำลังใช้งาน" : "ปิดแล้ว"}
              </StatusBadge>
            </header>
            <dl className="cycle-totals">
              <div>
                <dt>ยอด Fine รวม</dt>
                <dd>{formatBaht(cycle.totalFineAmountBaht)}</dd>
              </div>
              <div>
                <dt>ชำระแล้ว</dt>
                <dd>{formatBaht(cycle.paidAmountBaht)}</dd>
              </div>
              <div>
                <dt>ยอดค้าง</dt>
                <dd>{formatBaht(cycle.pendingAmountBaht)}</dd>
              </div>
            </dl>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">ครั้งที่</th>
                    <th scope="col">วันเวลาเกิดเหตุ</th>
                    <th scope="col">หมายเหตุ</th>
                    <th scope="col">สถานะ</th>
                    <th scope="col">Fine</th>
                    <th scope="col">การชำระ</th>
                    <th scope="col">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {orderViolations(cycle.violations).map((violation) => {
                    const canCancel =
                      cancellationAllowed &&
                      violation.status !== "CANCELLED";
                    const canMarkPaid =
                      cycle.status === "OPEN" &&
                      violation.fine?.status === "PENDING";

                    return (
                      <tr
                        data-violation-id={violation.id}
                        key={violation.id}
                      >
                        <td>{violation.sequenceNumber ?? "—"}</td>
                        <td>{formatThaiDateTime(violation.occurredAt)}</td>
                        <td>
                          {violation.note ?? "—"}
                          {violation.cancellationReason ? (
                            <small className="cancellation-reason">
                              เหตุผล: {violation.cancellationReason}
                            </small>
                          ) : null}
                        </td>
                        <td>
                          <StatusBadge tone={violationTones[violation.status]}>
                            {violationLabels[violation.status]}
                          </StatusBadge>
                        </td>
                        <td>
                          {violation.fine
                            ? formatBaht(violation.fine.amountBaht)
                            : "—"}
                        </td>
                        <td>
                          {violation.fine?.paidAt ? (
                            <span className="payment-detail">
                              {formatThaiDateTime(violation.fine.paidAt)}
                              <small>
                                {violation.fine.reference ?? "ไม่มีเลขอ้างอิง"}
                              </small>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <div className="row-actions">
                            {canMarkPaid ? (
                              <Button
                                aria-label={`บันทึกชำระ Violation ครั้งที่ ${violation.sequenceNumber}`}
                                onClick={() => onMarkPaid?.(violation)}
                                variant="primary"
                              >
                                บันทึกชำระ
                              </Button>
                            ) : null}
                            {canCancel ? (
                              <Button
                                aria-label={`ยกเลิก Violation ครั้งที่ ${violation.sequenceNumber}`}
                                onClick={() =>
                                  onCancelViolation?.(violation)
                                }
                                variant="ghost"
                              >
                                ยกเลิก
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        );
      })}
    </section>
  );
}

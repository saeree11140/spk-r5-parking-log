import type { CycleResponse } from "@spk-r5-parking-log/shared-types";

import { formatBaht } from "@/features/dashboard/dashboard-summary";

export function HouseSummary({
  currentCycle,
}: {
  currentCycle: CycleResponse | null;
}) {
  const items = [
    {
      label: "Cycle ปัจจุบัน",
      value: currentCycle ? String(currentCycle.cycleNumber) : "—",
    },
    {
      label: "จำนวน Violation",
      value: String(currentCycle?.violationCount ?? 0),
    },
    {
      label: "Fine รอชำระ",
      value: String(currentCycle?.pendingFineCount ?? 0),
    },
    {
      label: "ยอดรอชำระ",
      value: formatBaht(currentCycle?.pendingAmountBaht ?? 0),
    },
  ];

  return (
    <section aria-label="สรุปบ้าน" className="house-summary-grid">
      {items.map((item) => (
        <article className="house-summary-card" key={item.label}>
          <span>{item.label}</span>
          <strong className="metric-value">{item.value}</strong>
        </article>
      ))}
    </section>
  );
}

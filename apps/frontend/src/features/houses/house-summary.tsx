import type { CycleSummary } from "@spk-r5-parking-log/shared-types";

import { formatBaht } from "@/features/dashboard/dashboard-summary";

function summaryItems(cycle: CycleSummary | null) {
  return [
    {
      label: "Cycle ปัจจุบัน",
      value: cycle ? String(cycle.cycleNumber) : "—",
    },
    {
      label: "จำนวน Violation",
      value: String(cycle?.violationCount ?? 0),
    },
    {
      label: "Fine รอชำระ",
      value: String(cycle?.pendingFineCount ?? 0),
    },
    {
      label: "ยอดรอชำระ",
      value: formatBaht(cycle?.pendingAmountBaht ?? 0),
    },
  ];
}

function SummaryCards({ cycle }: { cycle: CycleSummary | null }) {
  return (
    <div className="house-summary-grid">
      {summaryItems(cycle).map((item) => (
        <article className="house-summary-card" key={item.label}>
          <span>{item.label}</span>
          <strong className="metric-value">{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

export function HouseSummary({
  currentCycles,
}: {
  currentCycles: CycleSummary[];
}) {
  return (
    <section aria-label="สรุปบ้าน" className="house-summary-stack">
      {currentCycles.length === 0 ? (
        <SummaryCards cycle={null} />
      ) : (
        currentCycles.map((cycle) => (
          <section
            aria-label={cycle.category.name}
            className="house-summary-category"
            key={cycle.id}
          >
            <h3>{cycle.category.name}</h3>
            <SummaryCards cycle={cycle} />
          </section>
        ))
      )}
    </section>
  );
}

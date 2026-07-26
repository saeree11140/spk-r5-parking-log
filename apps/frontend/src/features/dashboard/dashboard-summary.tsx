import type { DashboardMetrics } from "./dashboard-selectors";

const numberFormatter = new Intl.NumberFormat("th-TH");

export function formatBaht(amountBaht: number): string {
  return `฿${numberFormatter.format(amountBaht)}`;
}

export function DashboardSummary({
  metrics,
}: {
  metrics: DashboardMetrics;
}) {
  const items = [
    { label: "บ้านทั้งหมด", value: numberFormatter.format(metrics.totalHouses) },
    {
      label: "บ้านที่มี Violation",
      value: numberFormatter.format(metrics.activeViolationHouseCount),
    },
    {
      label: "Fine รอชำระ",
      value: numberFormatter.format(metrics.pendingFineCount),
    },
    {
      label: "ยอดรอชำระรวม",
      value: formatBaht(metrics.pendingAmountBaht),
    },
  ];

  return (
    <section aria-label="สรุปภาพรวม" className="metric-grid">
      {items.map((item) => (
        <article className="metric-card" key={item.label}>
          <p>{item.label}</p>
          <strong className="metric-value">{item.value}</strong>
        </article>
      ))}
    </section>
  );
}

export function DashboardSummarySkeleton() {
  return (
    <section aria-label="กำลังโหลดสรุปภาพรวม" className="metric-grid">
      {Array.from({ length: 4 }, (_, index) => (
        <article
          aria-label="กำลังโหลด KPI"
          className="metric-card"
          key={index}
        >
          <span className="skeleton" />
          <span className="skeleton skeleton--metric" />
        </article>
      ))}
    </section>
  );
}

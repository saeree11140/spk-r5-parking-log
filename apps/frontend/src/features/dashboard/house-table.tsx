import type { HouseSummary } from "@spk-r5-parking-log/shared-types";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";

import { formatBaht } from "./dashboard-summary";

export function HouseTable({ houses }: { houses: HouseSummary[] }) {
  return (
    <div className="table-card">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">รหัสบ้าน</th>
              <th scope="col">เลขที่บ้าน</th>
              <th scope="col">Violation ปัจจุบัน</th>
              <th scope="col">Fine รอชำระ</th>
              <th scope="col">ยอดค้าง</th>
              <th scope="col">สถานะ</th>
              <th scope="col">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {houses.map((house) => (
              <tr key={house.id}>
                <td>
                  <span className="house-code">{house.code}</span>
                </td>
                <td>{house.actualHouseNumber ?? "—"}</td>
                <td>{house.currentCycle?.violationCount ?? 0}</td>
                <td>{house.currentCycle?.pendingFineCount ?? 0}</td>
                <td>
                  {formatBaht(house.currentCycle?.pendingAmountBaht ?? 0)}
                </td>
                <td>
                  <StatusBadge tone={house.isActive ? "success" : "neutral"}>
                    {house.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                  </StatusBadge>
                </td>
                <td>
                  <Link
                    className="detail-link"
                    href={`/houses/${house.code}`}
                  >
                    ดูรายละเอียด
                    <ArrowUpRight aria-hidden="true" size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

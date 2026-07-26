import { Search } from "lucide-react";

import {
  type HouseFilter,
  useDashboardStore,
} from "@/stores/dashboard-store";

const filterOptions: Array<{ label: string; value: HouseFilter }> = [
  { label: "ทั้งหมด", value: "ALL" },
  { label: "มี Violation", value: "ACTIVE_VIOLATIONS" },
  { label: "มี Fine รอชำระ", value: "PENDING_FINE" },
  { label: "ไม่มีประวัติใน Cycle ปัจจุบัน", value: "NO_CURRENT_ACTIVITY" },
  { label: "บ้านปิดใช้งาน", value: "INACTIVE" },
];

export function HouseFilters() {
  const searchQuery = useDashboardStore((state) => state.searchQuery);
  const houseFilter = useDashboardStore((state) => state.houseFilter);
  const setSearchQuery = useDashboardStore((state) => state.setSearchQuery);
  const setHouseFilter = useDashboardStore((state) => state.setHouseFilter);

  return (
    <section aria-label="ค้นหาและกรองบ้าน" className="filter-bar">
      <label className="search-field">
        <span className="sr-only">ค้นหาบ้าน</span>
        <Search aria-hidden="true" size={19} />
        <input
          aria-label="ค้นหาบ้าน"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="ค้นหารหัสบ้านหรือเลขที่บ้าน"
          type="search"
          value={searchQuery}
        />
      </label>
      <label className="select-field">
        <span>กรองสถานะบ้าน</span>
        <select
          aria-label="กรองสถานะบ้าน"
          onChange={(event) =>
            setHouseFilter(event.target.value as HouseFilter)
          }
          value={houseFilter}
        >
          {filterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

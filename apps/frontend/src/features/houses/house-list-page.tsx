"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { filterHouses } from "@/features/dashboard/dashboard-selectors";
import { HouseFilters } from "@/features/dashboard/house-filters";
import { HouseTable } from "@/features/dashboard/house-table";
import { parkingApi } from "@/lib/api/parking-api";
import { queryKeys } from "@/lib/query/keys";
import { useDashboardStore } from "@/stores/dashboard-store";

export function HouseListPage() {
  const searchQuery = useDashboardStore((state) => state.searchQuery);
  const houseFilter = useDashboardStore((state) => state.houseFilter);
  const housesQuery = useQuery({
    queryFn: parkingApi.getHouses,
    queryKey: queryKeys.houses,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  if (housesQuery.isPending) {
    return (
      <div
        aria-label="กำลังโหลดรายชื่อบ้าน"
        className="page-stack"
        role="status"
      >
        <HouseListHeader onRefresh={() => undefined} refreshing />
        <div className="loading-table">
          <span className="skeleton skeleton--title" />
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      </div>
    );
  }

  if (housesQuery.isError) {
    return (
      <div className="page-stack">
        <HouseListHeader onRefresh={() => void housesQuery.refetch()} />
        <ErrorState
          message={
            housesQuery.error instanceof Error
              ? housesQuery.error.message
              : "เกิดข้อผิดพลาด กรุณาลองใหม่"
          }
          onRetry={() => void housesQuery.refetch()}
        />
      </div>
    );
  }

  const houses = housesQuery.data;
  const filteredHouses = filterHouses(houses, searchQuery, houseFilter);

  return (
    <div className="page-stack">
      <HouseListHeader
        onRefresh={() => void housesQuery.refetch()}
        refreshing={housesQuery.isFetching}
      />
      {houses.length === 0 ? (
        <EmptyState
          description="ตรวจสอบว่า Backend และฐานข้อมูลพร้อมใช้งาน"
          title="ยังไม่มีข้อมูลบ้าน"
        />
      ) : (
        <>
          <HouseFilters />
          {filteredHouses.length === 0 ? (
            <EmptyState
              description="ลองเปลี่ยนคำค้นหาหรือตัวกรอง"
              title="ไม่พบบ้านตามเงื่อนไข"
            />
          ) : (
            <HouseTable houses={filteredHouses} />
          )}
        </>
      )}
    </div>
  );
}

function HouseListHeader({
  onRefresh,
  refreshing = false,
}: {
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">SPK R5 PARKING LOG</p>
        <h1>รายชื่อบ้าน</h1>
        <p>ค้นหาและตรวจสอบข้อมูลบ้าน 164 หลัง</p>
      </div>
      <Button
        aria-label="รีเฟรชข้อมูลบ้าน"
        disabled={refreshing}
        icon={RefreshCw}
        onClick={onRefresh}
        variant="secondary"
      >
        รีเฟรช
      </Button>
    </header>
  );
}

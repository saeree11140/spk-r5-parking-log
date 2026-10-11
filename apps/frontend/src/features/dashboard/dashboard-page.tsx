"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { parkingApi } from "@/lib/api/parking-api";
import { queryKeys } from "@/lib/query/keys";
import { useDashboardStore } from "@/stores/dashboard-store";

import { CategoryFilterSelect } from "./category-filter-select";
import { getDashboardMetrics } from "./dashboard-selectors";
import {
  DashboardSummary,
  DashboardSummarySkeleton,
} from "./dashboard-summary";

export function DashboardPage() {
  const categoryFilter = useDashboardStore((state) => state.categoryFilter);
  const housesQuery = useQuery({
    queryFn: parkingApi.getHouses,
    queryKey: queryKeys.houses,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  if (housesQuery.isPending) {
    return (
      <div aria-label="กำลังโหลด Dashboard" className="page-stack" role="status">
        <DashboardHeader onRefresh={() => undefined} refreshing />
        <DashboardSummarySkeleton />
      </div>
    );
  }

  if (housesQuery.isError) {
    return (
      <div className="page-stack">
        <DashboardHeader onRefresh={() => void housesQuery.refetch()} />
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

  return (
    <div className="page-stack">
      <DashboardHeader
        onRefresh={() => void housesQuery.refetch()}
        refreshing={housesQuery.isFetching}
      />
      {houses.length > 0 ? (
        <section aria-label="กรองภาพรวม" className="filter-bar">
          <CategoryFilterSelect />
        </section>
      ) : null}
      <DashboardSummary metrics={getDashboardMetrics(houses, categoryFilter)} />
      {houses.length === 0 ? (
        <EmptyState
          description="ตรวจสอบว่า Backend และฐานข้อมูลพร้อมใช้งาน"
          title="ยังไม่มีข้อมูลบ้าน"
        />
      ) : null}
    </div>
  );
}

function DashboardHeader({
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
        <h1>ภาพรวมบ้าน</h1>
        <p>ตรวจสอบ Violation และ Fine ของบ้าน 164 หลัง</p>
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

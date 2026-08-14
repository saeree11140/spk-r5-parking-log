"use client";

import type { ViolationResponse } from "@spk-r5-parking-log/shared-types";
import { useQuery } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SuccessNotice,
} from "@/components/ui/feedback";
import { MarkFinePaidModal } from "@/features/payments/mark-fine-paid-modal";
import { CancelViolationModal } from "@/features/violations/cancel-violation-modal";
import { CreateViolationModal } from "@/features/violations/create-violation-modal";
import { EditViolationModal } from "@/features/violations/edit-violation-modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { parkingApi } from "@/lib/api/parking-api";
import { queryKeys } from "@/lib/query/keys";

import { CycleHistory } from "./cycle-history";
import { HouseSummary } from "./house-summary";

type ActiveDialog =
  | { type: "create" }
  | { type: "cancel"; violation: ViolationResponse }
  | { type: "edit"; violation: ViolationResponse }
  | { type: "markPaid"; violation: ViolationResponse }
  | null;

export function HouseDetailPage({ houseCode }: { houseCode: string }) {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const houseQuery = useQuery({
    queryFn: () => parkingApi.getHouse(houseCode),
    queryKey: queryKeys.house(houseCode),
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  if (houseQuery.isPending) {
    return (
      <div className="page-stack">
        <LoadingState label="กำลังโหลดรายละเอียดบ้าน" />
      </div>
    );
  }

  if (houseQuery.isError) {
    return (
      <ErrorState
        message={
          houseQuery.error instanceof Error
            ? houseQuery.error.message
            : "เกิดข้อผิดพลาด กรุณาลองใหม่"
        }
        onRetry={() => void houseQuery.refetch()}
      />
    );
  }

  const house = houseQuery.data;
  const currentCycle =
    [...house.cycles]
      .sort((left, right) => right.cycleNumber - left.cycleNumber)
      .find((cycle) => cycle.status === "OPEN") ?? null;

  return (
    <div className="page-stack">
      <nav aria-label="เส้นทางนำทาง" className="breadcrumbs">
        <Link href="/">ภาพรวม</Link>
        <span aria-hidden="true">/</span>
        <span>{house.code}</span>
      </nav>
      <header className="house-header">
        <div>
          <div className="house-title-line">
            <h1>{house.code}</h1>
            <StatusBadge tone={house.isActive ? "success" : "neutral"}>
              {house.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
            </StatusBadge>
          </div>
          <p>เลขที่บ้าน {house.actualHouseNumber ?? "—"}</p>
        </div>
        <div className="header-actions">
          <Button
            aria-label="รีเฟรชรายละเอียดบ้าน"
            disabled={houseQuery.isFetching}
            icon={RefreshCw}
            onClick={() => void houseQuery.refetch()}
            variant="secondary"
          >
            รีเฟรช
          </Button>
          {house.isActive ? (
            <Button
              icon={Plus}
              onClick={() => {
                setSuccessMessage(null);
                setActiveDialog({ type: "create" });
              }}
              variant="primary"
            >
              เพิ่ม Violation
            </Button>
          ) : null}
        </div>
      </header>
      {successMessage ? (
        <SuccessNotice>{successMessage}</SuccessNotice>
      ) : null}
      <HouseSummary currentCycle={currentCycle} />
      {house.cycles.length === 0 ? (
        <EmptyState
          description="เมื่อบันทึก Violation ครั้งแรก ระบบจะสร้าง Cycle ให้อัตโนมัติ"
          title="ยังไม่มีประวัติ Violation"
        />
      ) : (
        <CycleHistory
          cycles={house.cycles}
          onCancelViolation={(violation) => {
            setSuccessMessage(null);
            setActiveDialog({ type: "cancel", violation });
          }}
          onEditViolation={(violation) => {
            setSuccessMessage(null);
            setActiveDialog({ type: "edit", violation });
          }}
          onMarkPaid={(violation) => {
            setSuccessMessage(null);
            setActiveDialog({ type: "markPaid", violation });
          }}
        />
      )}
      <CreateViolationModal
        houseCode={houseCode}
        onClose={() => setActiveDialog(null)}
        onSuccess={setSuccessMessage}
        open={activeDialog?.type === "create"}
      />
      {activeDialog?.type === "cancel" ? (
        <CancelViolationModal
          houseCode={houseCode}
          onClose={() => setActiveDialog(null)}
          onSuccess={setSuccessMessage}
          open
          violation={activeDialog.violation}
        />
      ) : null}
      {activeDialog?.type === "edit" ? (
        <EditViolationModal
          houseCode={houseCode}
          onClose={() => setActiveDialog(null)}
          onSuccess={setSuccessMessage}
          open
          violation={activeDialog.violation}
        />
      ) : null}
      {activeDialog?.type === "markPaid" ? (
        <MarkFinePaidModal
          houseCode={houseCode}
          onClose={() => setActiveDialog(null)}
          onSuccess={setSuccessMessage}
          open
          violation={activeDialog.violation}
        />
      ) : null}
    </div>
  );
}

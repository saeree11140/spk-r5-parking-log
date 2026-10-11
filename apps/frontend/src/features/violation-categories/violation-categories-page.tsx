"use client";

import type { ViolationCategorySummary } from "@spk-r5-parking-log/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Power } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SuccessNotice,
} from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { parkingApi } from "@/lib/api/parking-api";
import {
  invalidateViolationCategoryQueries,
  queryKeys,
} from "@/lib/query/keys";

import { CategoryNameModal } from "./category-name-modal";

interface NameDialog {
  open: boolean;
  target: ViolationCategorySummary | null;
}

export function ViolationCategoriesPage() {
  const queryClient = useQueryClient();
  const [nameDialog, setNameDialog] = useState<NameDialog>({
    open: false,
    target: null,
  });
  const [confirm, setConfirm] = useState<{
    open: boolean;
    target: ViolationCategorySummary | null;
  }>({ open: false, target: null });
  const deactivateTarget = confirm.open ? confirm.target : null;
  const [notice, setNotice] = useState("");
  const categoriesQuery = useQuery({
    queryFn: () => parkingApi.getViolationCategories(),
    queryKey: queryKeys.violationCategories,
  });
  const setActive = useMutation({
    mutationFn: ({
      category,
      isActive,
    }: {
      category: ViolationCategorySummary;
      isActive: boolean;
    }) =>
      isActive
        ? parkingApi.activateViolationCategory(category.id)
        : parkingApi.deactivateViolationCategory(category.id),
    onSuccess: async (_, { isActive }) => {
      await invalidateViolationCategoryQueries(queryClient, {
        renamed: false,
      });
      setConfirm((current) => ({ ...current, open: false }));
      setNotice(isActive ? "เปิดใช้งานหมวดแล้ว" : "ปิดใช้งานหมวดแล้ว");
    },
  });

  function closeConfirm() {
    if (setActive.isPending) return;
    setActive.reset();
    setConfirm((current) => ({ ...current, open: false }));
  }

  function openNameDialog(target: ViolationCategorySummary | null) {
    setNotice("");
    setNameDialog({ open: true, target });
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">SETTINGS · VIOLATION CATEGORIES</p>
          <h1>หมวดการกระทำผิด</h1>
          <p>
            เพิ่ม เปลี่ยนชื่อ หรือปิดใช้งานหมวด
            หมวดที่ปิดใช้งานจะเลือกตอนบันทึกใหม่ไม่ได้
          </p>
        </div>
        <Button
          icon={Plus}
          onClick={() => openNameDialog(null)}
          variant="primary"
        >
          เพิ่มหมวด
        </Button>
      </header>

      {notice ? <SuccessNotice>{notice}</SuccessNotice> : null}
      {setActive.isError && !deactivateTarget ? (
        <p className="form-error" role="alert">
          {setActive.error instanceof Error
            ? setActive.error.message
            : "บันทึกไม่สำเร็จ"}
        </p>
      ) : null}
      {categoriesQuery.isPending ? (
        <LoadingState label="กำลังโหลดหมวด" />
      ) : categoriesQuery.isError ? (
        <ErrorState
          message={
            categoriesQuery.error instanceof Error
              ? categoriesQuery.error.message
              : "โหลดหมวดไม่สำเร็จ"
          }
          onRetry={() => void categoriesQuery.refetch()}
        />
      ) : categoriesQuery.data.length === 0 ? (
        <EmptyState
          description="เพิ่มหมวดเพื่อเริ่มบันทึกการกระทำผิด"
          title="ยังไม่มีหมวด"
        />
      ) : (
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">ชื่อหมวด</th>
                  <th scope="col">สถานะ</th>
                  <th scope="col">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {categoriesQuery.data.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>
                      <StatusBadge
                        tone={category.isActive ? "success" : "neutral"}
                      >
                        {category.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                      </StatusBadge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Button
                          aria-label={`เปลี่ยนชื่อ ${category.name}`}
                          icon={Pencil}
                          onClick={() => openNameDialog(category)}
                          variant="ghost"
                        />
                        {category.isActive ? (
                          <Button
                            aria-label={`ปิดใช้งาน ${category.name}`}
                            icon={Power}
                            onClick={() => {
                              setNotice("");
                              setActive.reset();
                              setConfirm({ open: true, target: category });
                            }}
                            variant="danger"
                          />
                        ) : (
                          <Button
                            aria-label={`เปิดใช้งาน ${category.name}`}
                            disabled={setActive.isPending}
                            icon={Power}
                            onClick={() => {
                              setNotice("");
                              setActive.reset();
                              setActive.mutate({ category, isActive: true });
                            }}
                            variant="secondary"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CategoryNameModal
        onClose={() =>
          setNameDialog((current) => ({ ...current, open: false }))
        }
        onSaved={setNotice}
        open={nameDialog.open}
        target={nameDialog.target}
      />
      <Modal
        footer={
          <>
            <Button disabled={setActive.isPending} onClick={closeConfirm}>
              ยกเลิก
            </Button>
            <Button
              disabled={setActive.isPending}
              onClick={() => {
                if (deactivateTarget) {
                  setActive.mutate({
                    category: deactivateTarget,
                    isActive: false,
                  });
                }
              }}
              variant="danger"
            >
              ปิดใช้งาน
            </Button>
          </>
        }
        onClose={closeConfirm}
        open={confirm.open}
        pending={setActive.isPending}
        title={`ปิดใช้งาน ${confirm.target?.name ?? "หมวด"}`}
      >
        <p className="confirmation-copy">
          บันทึก Violation ใหม่ในหมวดนี้ไม่ได้อีก แต่รายการในรอบที่ยังเปิดอยู่
          ยังจ่ายค่าปรับ ยกเลิก และแก้ไขได้ตามปกติ
        </p>
        {setActive.isError ? (
          <p className="form-error" role="alert">
            {setActive.error instanceof Error
              ? setActive.error.message
              : "บันทึกไม่สำเร็จ"}
          </p>
        ) : null}
      </Modal>
    </div>
  );
}

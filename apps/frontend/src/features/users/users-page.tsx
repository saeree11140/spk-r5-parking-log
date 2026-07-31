"use client";

import type { UserSummary } from "@spk-r5-parking-log/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SuccessNotice,
} from "@/components/ui/feedback";
import { usersApi } from "@/lib/api/users-api";
import { userKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";

import { CreateUserModal } from "./create-user-modal";
import { EditUserModal } from "./edit-user-modal";
import { ResetPasswordModal } from "./reset-password-modal";
import { UserTable } from "./user-table";

export function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === "ADMIN";
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserSummary | null>(null);
  const [resetTarget, setResetTarget] = useState<UserSummary | null>(null);
  const [notice, setNotice] = useState("");
  const usersQuery = useQuery({
    queryKey: userKeys.all,
    queryFn: usersApi.list,
    enabled: isAdmin,
  });
  const toggleActive = useMutation({
    mutationFn: (target: UserSummary) =>
      usersApi.update(target.id, { isActive: !target.isActive }),
    onSuccess: async (_, target) => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
      setNotice(`${target.isActive ? "ปิด" : "เปิด"}บัญชีแล้ว`);
    },
  });

  useEffect(() => {
    if (currentUser && !isAdmin) router.replace("/");
  }, [currentUser, isAdmin, router]);

  if (!isAdmin) return null;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">ADMIN · ACCESS CONTROL</p>
          <h1>ผู้ใช้งาน</h1>
          <p>สร้างบัญชี กำหนดสิทธิ์ และ Reset Password ของเจ้าหน้าที่</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => setCreateOpen(true)}
          variant="primary"
        >
          สร้างผู้ใช้
        </Button>
      </header>

      {notice ? <SuccessNotice>{notice}</SuccessNotice> : null}
      {usersQuery.isPending ? (
        <LoadingState label="กำลังโหลดผู้ใช้งาน" />
      ) : usersQuery.isError ? (
        <ErrorState
          message={
            usersQuery.error instanceof Error
              ? usersQuery.error.message
              : "โหลดผู้ใช้งานไม่สำเร็จ"
          }
          onRetry={() => usersQuery.refetch()}
        />
      ) : usersQuery.data.length === 0 ? (
        <EmptyState
          action={
            <Button onClick={() => setCreateOpen(true)} variant="primary">
              สร้างผู้ใช้คนแรก
            </Button>
          }
          description="เริ่มเพิ่ม ADMIN หรือ STAFF เพื่อใช้งานระบบ"
          title="ยังไม่มีผู้ใช้งาน"
        />
      ) : (
        <>
          <div className="user-count">
            <Users aria-hidden="true" size={18} />
            {usersQuery.data.length} บัญชี
          </div>
          <UserTable
            currentUser={currentUser}
            onEdit={setEditTarget}
            onResetPassword={setResetTarget}
            onToggleActive={(target) => toggleActive.mutate(target)}
            users={usersQuery.data}
          />
        </>
      )}

      <CreateUserModal onClose={() => setCreateOpen(false)} open={createOpen} />
      <EditUserModal
        onClose={() => setEditTarget(null)}
        open={editTarget !== null}
        target={editTarget}
      />
      <ResetPasswordModal
        onClose={() => setResetTarget(null)}
        open={resetTarget !== null}
        target={resetTarget}
      />
    </div>
  );
}

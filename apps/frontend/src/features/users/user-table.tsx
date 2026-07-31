import type { AuthUser, UserSummary } from "@spk-r5-parking-log/shared-types";
import { KeyRound, Pencil, Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export function UserTable({
  currentUser,
  onEdit,
  onResetPassword,
  onToggleActive,
  users,
}: {
  currentUser: AuthUser;
  onEdit: (user: UserSummary) => void;
  onResetPassword: (user: UserSummary) => void;
  onToggleActive: (user: UserSummary) => void;
  users: UserSummary[];
}) {
  return (
    <div className="table-card">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ชื่อผู้ใช้</th>
              <th>ชื่อที่แสดง</th>
              <th>สิทธิ์</th>
              <th>สถานะ</th>
              <th>รหัสผ่าน</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="system-type">{user.username}</td>
                <td>{user.displayName}</td>
                <td>
                  <StatusBadge
                    tone={user.role === "ADMIN" ? "info" : "neutral"}
                  >
                    {user.role}
                  </StatusBadge>
                </td>
                <td>
                  <StatusBadge tone={user.isActive ? "success" : "danger"}>
                    {user.isActive ? "ใช้งาน" : "ปิดบัญชี"}
                  </StatusBadge>
                </td>
                <td>
                  {user.mustChangePassword ? (
                    <StatusBadge tone="warning">รอเปลี่ยนรหัสผ่าน</StatusBadge>
                  ) : (
                    "ปกติ"
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    <Button
                      aria-label={`แก้ไข ${user.username}`}
                      icon={Pencil}
                      onClick={() => onEdit(user)}
                      variant="ghost"
                    />
                    <Button
                      aria-label={`Reset Password ${user.username}`}
                      icon={KeyRound}
                      onClick={() => onResetPassword(user)}
                      variant="ghost"
                    />
                    {user.id !== currentUser.id ? (
                      <Button
                        aria-label={`${user.isActive ? "ปิด" : "เปิด"}บัญชี ${user.username}`}
                        icon={Power}
                        onClick={() => onToggleActive(user)}
                        variant={user.isActive ? "danger" : "secondary"}
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

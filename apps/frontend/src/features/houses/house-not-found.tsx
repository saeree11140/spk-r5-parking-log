import { Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/ui/feedback";

export function HouseNotFound() {
  return (
    <div className="page-stack">
      <EmptyState
        action={<Link to="/">กลับหน้าภาพรวม</Link>}
        description="รหัสบ้านต้องอยู่ระหว่าง R5-001 ถึง R5-164"
        title="ไม่พบบ้าน"
      />
    </div>
  );
}

# 03: houseCode ที่ไม่มีอยู่จริงแสดงหน้า "ไม่พบบ้าน"

**What to build:** route `/houses/$houseCode` เช็ก pattern R5-001..164 ถ้าไม่ตรงให้ `throw notFound()` และ `notFoundComponent` แสดง "ไม่พบบ้าน" พร้อมลิงก์กลับหน้าภาพรวม แทน `generateStaticParams` กับ `dynamicParams = false` ของ Next ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-23-vite-tanstack-router/spec.md`

**Blocked by:** 01

**Status:** done

- [x] test: `/houses/R5-165` และ `/houses/abc` แสดงหน้า "ไม่พบบ้าน"
- [x] test: `/houses/R5-001` แสดงหน้ารายละเอียดบ้าน

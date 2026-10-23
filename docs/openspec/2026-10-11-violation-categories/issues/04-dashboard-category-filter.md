# 04: ตัวกรองหมวดใน dashboard

**What to build:** staff กรอง dashboard ตามหมวดได้ เช่น ดูเฉพาะบ้านที่มีค่าปรับจอดรถค้าง ค่าเริ่มต้นคือ "ทั้งหมด" ตัวกรองนี้ทำงานร่วมกับตัวกรองสถานะและช่องค้นหาเดิม metrics และตารางบ้านคิดตามหมวดที่เลือก ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-11-violation-categories/spec.md`

**Blocked by:** 02 (นับและเปิดรอบแยกตามหมวด)

**Status:** done

- [x] dashboard มีตัวกรองหมวด ค่าเริ่มต้น "ทั้งหมด" รายการหมวดมาจาก API list หมวด
- [x] metrics (บ้านที่มี violation, ค่าปรับค้าง, ยอดค้าง) คิดจาก `currentCycles` ที่ผ่านตัวกรองหมวด
- [x] ตัวกรองสถานะ "ไม่มีรายการค้าง" หมายถึงไม่มีรอบ OPEN ในหมวดที่เลือก
- [x] ถ้าเลือก "ทั้งหมด" ตารางบ้านแสดงยอดค้างรวมทุกหมวด
- [x] selector test ครอบคลุมการรวมตัวกรองหมวด สถานะ และช่องค้นหา และมี component test ของ dashboard

## Comments

- The category filter lives in the dashboard store, so the overview KPIs and the house list share one selection, the same as the existing search and status filters.
- If the selected category's name is unavailable (still loading or failed to load), the select keeps showing a placeholder option instead of falling back to "ทั้งหมด". It also shows a retry button.
- The three places that fetch categories now share one `useViolationCategoriesQuery` hook.

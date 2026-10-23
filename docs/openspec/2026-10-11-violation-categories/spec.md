# Spec: หมวดการกระทำผิด และกติกาค่าปรับใหม่

Status: done
Started: 2026-10-11
Done: 2026-10-11

## Problem Statement

นิติบุคคลต้องการเปลี่ยนกติกาค่าปรับ และต้องการบันทึกการกระทำผิดเรื่องอื่นนอกจากจอดรถผิดระเบียบ เช่น ปล่อยสัตว์เลี้ยงขับถ่ายในพื้นที่ส่วนกลางแล้วไม่เก็บ และอาจมีเรื่องอื่นเพิ่มอีกในอนาคต

ระบบตอนนี้ทำเรื่องนี้ไม่ได้ เพราะ:

- มีการกระทำผิดได้แบบเดียว คือจอดรถผิดระเบียบ ไม่มีหมวด
- ค่าปรับตายตัว: แจ้งเตือน 2 ครั้ง ครั้งที่ 3 ปรับ 1,000 บาท ครั้งที่ 4 ขึ้นไปปรับครั้งละ 500 บาท ตอนนี้นิติบุคคลต้องการแจ้งเตือนครั้งเดียว ครั้งที่ 2 ปรับ 1,000 บาท และครั้งที่ 3 ขึ้นไปปรับครั้งละ 500 บาท
- รอบ (cycle) ผูกกับบ้านอย่างเดียว ถ้าเอาการกระทำผิดทุกเรื่องมานับรวมกัน บ้านที่จอดรถผิด 1 ครั้งแล้วปล่อยสัตว์เลี้ยงขับถ่าย 1 ครั้ง จะโดนปรับทันที ซึ่งไม่ตรงกับเจตนา

## Solution

- เพิ่ม **หมวดการกระทำผิด** (Violation Category) ทุก violation ต้องอยู่ในหมวดใดหมวดหนึ่ง
- การนับครั้งและรอบแยกตาม **บ้าน + หมวด** หมวดต่างกันไม่นับรวมกัน
  - ตัวอย่าง: บ้าน R5-001 จอดรถผิดครั้งที่ 2 โดนปรับ 1,000 บาท ครั้งที่ 3 โดนปรับ 500 บาท
  - ถ้าบ้านเดียวกันปล่อยสัตว์เลี้ยงขับถ่ายแล้วไม่เก็บเป็นครั้งที่ 2 ของหมวดนั้น ก็โดนปรับ 1,000 บาท
- กติกาค่าปรับใหม่ (V2) ใช้เหมือนกันทุกหมวด:
  - ครั้งที่ 1: แจ้งเตือน ไม่มีค่าปรับ
  - ครั้งที่ 2: ค่าปรับ 1,000 บาท
  - ครั้งที่ 3 เป็นต้นไป: ค่าปรับครั้งละ 500 บาท
- รอบที่เปิดอยู่ก่อน deploy ใช้กติกาเดิม (V1) ต่อจนปิดรอบ รอบที่เปิดหลัง deploy ใช้ V2 เสมอ ลูกบ้านจะไม่โดนปรับย้อนหลังเพราะเปลี่ยนกติกา
- `ADMIN` และ `STAFF` เพิ่ม เปลี่ยนชื่อ ปิดใช้งาน และเปิดใช้งานหมวดผ่าน UI ได้ ไม่มีการลบหมวด
- หน้าบ้านแสดงรอบปัจจุบันแยกตามหมวด dashboard มีตัวกรองหมวด

## User Stories

### หมวดการกระทำผิด

1. As a staff member, I want to see the list of violation categories, so that I know which categories can be recorded.
2. As a staff member, I want to add a new violation category, so that the community can enforce a new rule without a developer.
3. As an admin, I want to add a new violation category, so that the community can enforce a new rule without a developer.
4. As a staff member, I want to rename a category, so that I can fix a typo or clarify its wording.
5. As a staff member, I want to deactivate a category, so that a rule that is no longer enforced cannot be chosen for new violations.
6. As a staff member, I want to reactivate a category, so that a rule deactivated by mistake can be used again.
7. As a staff member, I want the system to reject a category name that duplicates an existing one (ignoring case and leading/trailing whitespace), so that the list has no confusing duplicates.
8. As a staff member, I want the system to reject an empty category name or one longer than 100 characters, so that names stay readable.
9. As a staff member, I want to see which categories are inactive, so that I don't confuse them with active ones.
10. As an admin, I want every create, rename, deactivate and activate action on a category to be written to the audit log with who did it, so that changes can be traced.
11. As a staff member, I want the system to ship with the two categories "จอดรถผิดระเบียบ" and "ปล่อยสัตว์เลี้ยงขับถ่ายในพื้นที่ส่วนกลางแล้วไม่เก็บ", so that I can start using it right away.

### การบันทึก Violation

12. As a staff member, I want to pick a category every time I record a violation, so that it is counted in the right category.
13. As a staff member, I want the system to require a category with no default, so that I can't accidentally record the wrong category.
14. As a staff member, I want the category dropdown to show only active categories, so that I don't pick a rule that is no longer enforced.
15. As a staff member, I want the system to reject a violation in an inactive or non-existent category, so that the data stays correct even if the frontend sends a stale value.
16. As a staff member, I want each category of a house counted separately, so that one category's violations don't push another category into a fine.
17. As a staff member, I want the backend to compute the occurrence number and fine amount, so that nobody can set the occurrence number or fine by hand.
18. As a staff member, I want the 1st violation in a new cycle to be a warning, the 2nd to be fined 1,000 baht, and the 3rd onward to be fined 500 baht each, so that the system follows the new rule.
19. As a staff member, I want a backdated violation to be re-sequenced and re-fined only within its own category's cycle, so that other categories are unaffected.
20. As a staff member, I want the rule against backdating before a closed cycle to apply per category, so that closing a parking cycle does not block backdating a pet violation.
21. As a staff member, I want to cancel a violation and have only that category's cycle re-sequenced, so that other categories' fines stay the same.
22. As a staff member, I want editing a violation to not allow changing its category, so that I can't accidentally make two cycles' sequences and fines inconsistent.
23. As a staff member, when I recorded the wrong category, I want to cancel that violation with a reason and record a new one, so that a trace remains in the audit log.
24. As a staff member, I want to still cancel, edit and mark paid violations in an open cycle of a deactivated category, so that outstanding cases can be closed out.

### รอบและการชำระค่าปรับ

25. As a staff member, I want marking every fine in a category's cycle as paid to close only that category's cycle, so that other categories' cycles keep counting.
26. As a staff member, I want the next violation after a cycle closes to start again at occurrence 1 (a warning) of a new cycle in that category, so that residents who have paid get a fresh start.
27. As a staff member, I want the cycle number to count per house per category, so that the cycle history of each category is easy to read.

### กติกาเดิมกับข้อมูลเดิม

28. As an admin, I want all existing violations to be moved into the "จอดรถผิดระเบียบ" category, so that the history is complete.
29. As a resident, I want my cycle that was open before the rule change to keep using the old rule (2 warnings, 3rd 1,000, 4th onward 500) until the cycle closes, so that I am not fined retroactively without doing anything new.
30. As a staff member, I want the system to know which rule each cycle uses, so that re-sequencing after cancelling or editing a violation in an old cycle computes fines with the correct rule.
31. As a staff member, I want every cycle opened after deploy to use the new rule, even if the violation's occurredAt is before deploy, so that the rule is easy to explain and no cycle mixes two rules.
32. As a staff member, I want to see which rule a cycle uses on the house page, so that I can explain the fine to a resident.

### การแสดงผล

33. As a staff member, I want the house page to show the current cycle of each category that has an open cycle, each with its own row of occurrence numbers and colors as before, so that I can see a house's status per category at a glance.
34. As a staff member, I want each category's cycle history on the house page to be grouped or labeled by category, so that I can tell which rule each item belongs to.
35. As a staff member, I want each violation item to show its category name, so that I know what happened.
36. As a staff member, I want a category filter on the dashboard defaulting to "ทั้งหมด", so that I can find, for example, only houses with outstanding parking fines.
37. As a staff member, I want the dashboard totals (houses with violations, pending fines, pending amount) to follow the selected category filter, so that the numbers match the table.
38. As a staff member, I want the house table to show pending fines summed across every category when the filter is "ทั้งหมด", so that I know how much each house still owes in total.
39. As a staff member, I want the category management page reachable from the main menu by both roles, so that I can find it easily.
40. As a staff member, I want a renamed category to show its new name everywhere, including history, so that the display is consistent.

## Implementation Decisions

### Domain และ schema

- เพิ่ม model **ViolationCategory** มี field: id, name (unique แบบไม่สนตัวพิมพ์เล็กใหญ่หลังตัดช่องว่างหัวท้าย, ยาวสูงสุด 100), isActive, createdAt, updatedAt
- ตรวจ name ซ้ำที่ระดับ DB ด้วย (unique index บน `lower(trim(name))` หรือเก็บคอลัมน์ normalized แยก) ไม่ใช่แค่ตรวจในแอป
- **ViolationCycle** เพิ่ม:
  - `categoryId` (FK แบบ Restrict)
  - `fineRuleVersion` เป็น enum สองค่า: V1 = แจ้งเตือน 2 ครั้ง / 1,000 / 500 และ V2 = แจ้งเตือน 1 ครั้ง / 1,000 / 500
  - unique key เปลี่ยนจาก (houseId, cycleNumber) เป็น (houseId, categoryId, cycleNumber)
  - กฎที่ต้องคงไว้: มีรอบสถานะ OPEN ได้ไม่เกิน 1 รอบต่อ (houseId, categoryId)
- **ParkingViolation** ไม่ต้องเก็บ categoryId ซ้ำ ให้ได้หมวดจากรอบ
- คงชื่อ model `ParkingViolation` และตาราง `parking_violations` ไว้ การ rename ไปเป็นชื่อกลางๆ อยู่นอก scope
- กติกาค่าปรับ (pure function) รับ `fineRuleVersion` กับลำดับครั้ง แล้วคืนจำนวนเงิน การสร้าง sequence plan และ resequence อ่าน version จากรอบที่กำลังทำงานด้วย

### Migration

ทำใน migration เดียว ตามลำดับนี้:

1. สร้างตาราง categories
2. seed สองหมวด: "จอดรถผิดระเบียบ" และ "ปล่อยสัตว์เลี้ยงขับถ่ายในพื้นที่ส่วนกลางแล้วไม่เก็บ"
3. เพิ่ม `categoryId` แบบ nullable ใน cycles แล้ว backfill ทุกแถวเป็นหมวดจอดรถ
4. backfill `fineRuleVersion` = V1 ให้ทุกรอบที่มีอยู่ ทั้ง OPEN และ CLOSED
5. ตั้ง `categoryId` เป็น NOT NULL และเปลี่ยน unique key
6. ตั้ง default ของ `fineRuleVersion` สำหรับแถวใหม่เป็น V2 แต่แอปควรส่งค่านี้เองตอนสร้างรอบด้วย

ข้อกำหนดเพิ่มเติม:

- ห้ามคำนวณค่าปรับหรือ resequence ของรอบเดิมระหว่าง migrate
- seed script ต้องสร้างสองหมวดนี้แบบ idempotent สำหรับ dev DB

### API

ทุก endpoint ต้องมี role `ADMIN` หรือ `STAFF` และต้องผ่าน CSRF และ Origin validation เหมือน mutation อื่น

- **Categories module ใหม่:**
  - list หมวด: คืนทั้ง active และ inactive พร้อม isActive เรียงตาม createdAt
  - create: รับ name
  - rename: รับ name
  - deactivate และ activate: เรียกซ้ำกับสถานะเดิมให้ตอบสำเร็จโดยไม่เปลี่ยนอะไร หรือตอบ 409 ก็ได้ แต่ต้องเลือกแบบเดียวและเขียน test ไว้
- **error codes ใหม่:**
  - `CATEGORY_NOT_FOUND` (404)
  - `CATEGORY_NAME_TAKEN` (409)
  - `CATEGORY_INACTIVE` (409) ตอนสร้าง violation ในหมวดที่ปิดใช้งาน
- **audit:** entity type `ViolationCategory` ใช้ action `CREATE`, `UPDATE`, `ACTIVATE` และ `DEACTIVATE` ที่มีอยู่ before/after เก็บ name กับ isActive
- **Create violation:** input เพิ่ม `categoryId` แบบบังคับ (uuid)
  - backend หาหรือสร้างรอบ OPEN ของ (house, category) รอบที่สร้างใหม่ตั้ง `fineRuleVersion` เป็น V2
  - เช็ค backdate และ resequence ภายในรอบของหมวดนั้น
- **Update violation:** ไม่รับ `categoryId` ใช้ `forbidNonWhitelisted` ที่ตั้งไว้แล้ว ส่งมาจะได้ 400
- **Cancel violation และ mark fine paid:** logic เดิม ทำงานกับรอบของ violation นั้น ปิดรอบเมื่อค่าปรับในรอบนั้นจ่ายครบ ใช้ได้กับหมวดที่ปิดใช้งานด้วย
- **Shared types:**
  - `CycleSummary` และ `CycleResponse` เพิ่ม category (id, name, isActive) และ `fineRuleVersion`
  - `HouseSummary` เปลี่ยน `currentCycle` (ค่าเดียว) เป็น `currentCycles` (array ของรอบ OPEN แต่ละหมวด) เป็น breaking change ต้องแก้ frontend ไปพร้อมกัน
  - `ViolationMutationResponse.currentCycle` ยังเป็นรอบเดียว คือรอบของหมวดที่ถูกแก้
- **House list:** ต้อง query รอบ OPEN ของทุกหมวดพร้อม category ในครั้งเดียว ห้ามเกิด N+1 ต่อบ้าน

### Frontend

- **Create violation modal:**
  - เพิ่ม select หมวดแบบบังคับ ไม่มีค่า default และแสดงเฉพาะหมวด active
  - submit โดยไม่เลือกหมวด ให้แสดง error ที่ field
- **Edit violation modal:** แสดงหมวดแบบอ่านอย่างเดียว
- **House detail:**
  - จัดกลุ่มรอบปัจจุบันตามหมวด แต่ละหมวดมีแถวเลขครั้งและสีของตัวเอง (WARNING ไม่มีพื้น, PENDING_FINE แดง, PAID เขียว)
  - ประวัติรอบแสดงชื่อหมวดและป้ายกติกา (V1 / V2) เป็นภาษาไทย เช่น "กติกาเดิม: แจ้งเตือน 2 ครั้ง" และ "กติกาใหม่: แจ้งเตือน 1 ครั้ง"
- **Dashboard:**
  - เพิ่มตัวกรองหมวด ค่าเริ่มต้น "ทั้งหมด" ทำงานร่วมกับตัวกรองสถานะและช่องค้นหาเดิม
  - metrics และตารางบ้านคิดจาก `currentCycles` ที่ผ่านตัวกรองหมวด
  - ตัวกรอง "ไม่มีรายการค้าง" หมายถึงไม่มีรอบ OPEN ในหมวดที่เลือก
- **หน้าจัดการหมวดใหม่:**
  - อยู่ในเมนูหลัก ใช้ได้ทั้ง `ADMIN` และ `STAFF`
  - แสดงตารางชื่อและสถานะ มีปุ่มเพิ่ม เปลี่ยนชื่อ ปิดใช้งาน และเปิดใช้งาน
  - ปิดใช้งานต้องมี confirm dialog
  - ใช้ modal และ form pattern เดียวกับหน้า users

### เอกสาร

- แก้ business rules doc ให้สะท้อนกติกา V2 การนับแยกหมวด กติกา V1 สำหรับรอบเก่า และการจัดการหมวด
- เพิ่มคำศัพท์ลง glossary ตอนทำงานผ่าน `/domain-modeling`: Violation Category, Cycle (ต่อบ้าน + หมวด), Fine Rule Version

## Testing Decisions

เขียน test ที่ดูพฤติกรรมภายนอก (HTTP response, DB state ที่ผู้ใช้เห็น, UI ที่ render ออกมา) ไม่ test ว่าเรียก Prisma กี่ครั้งหรือเรียกด้วยอะไร และไม่เพิ่ม test แบบ mock Prisma ให้ service

### Seam 1: Backend ผ่าน HTTP (หลัก)

ต่อยอด e2e test ของ core parking API ที่ยิง API กับ Postgres จริง ครอบคลุม:

- **ตารางค่าปรับ V2:** violation 3 ครั้งในหมวดเดียว ได้ 0 / 1000 / 500
- **แยกหมวด:** หมวดจอดรถ 1 ครั้ง + หมวดสัตว์เลี้ยง 1 ครั้ง ต้องเป็นแจ้งเตือนทั้งคู่
- **ปิดรอบรายหมวด:** จ่ายค่าปรับหมวดจอดรถครบแล้ว รอบนั้นปิด แต่รอบหมวดสัตว์เลี้ยงยัง OPEN จากนั้น violation ถัดไปในหมวดจอดรถเริ่มรอบใหม่ที่ครั้งที่ 1
- **รอบ V1 เดิม:** seed รอบ V1 ที่มีแจ้งเตือน 2 ครั้ง แล้วเพิ่มครั้งที่ 3 ต้องได้ 1,000 ไม่ใช่ 500 และหลัง cancel ครั้งที่ 2 การ resequence ยังคิดแบบ V1
- **backdate รายหมวด:** ปิดรอบหมวดจอดรถแล้ว ยังบันทึก violation ย้อนหลังในหมวดสัตว์เลี้ยงได้
- **หมวด:**
  - CRUD ได้ทั้งสอง role
  - ชื่อซ้ำ (ต่างตัวพิมพ์หรือมีช่องว่าง) ได้ 409
  - สร้าง violation ในหมวด inactive ได้ 409
  - ยังจ่ายและยกเลิก violation ในรอบ OPEN ของหมวด inactive ได้
  - การกระทำกับหมวดมี audit log
- **validation:** update violation ที่ส่ง `categoryId` มาได้ 400 และ create ที่ไม่มี `categoryId` ได้ 400
- **house list:** ได้ `currentCycles` หลายหมวดถูกต้อง

### Seam 2: Pure function กติกาค่าปรับ

ต่อยอด unit test ของ parking rules แบบ table-driven ครอบคลุมทั้ง V1 และ V2 สำหรับลำดับครั้ง 1 ถึง 5 และ sequence plan ทั้งสองเวอร์ชัน

### Seam 3: Frontend component (vitest + Testing Library)

ทำตาม spec ที่มีอยู่ของ create violation modal, house detail page, dashboard page/selectors และ users page ครอบคลุม:

- **create violation modal:** select หมวดบังคับเลือก แสดงเฉพาะ active และส่ง `categoryId`
- **edit violation modal:** ไม่มีช่องแก้หมวด
- **house detail:** แสดงรอบปัจจุบันแยกหมวด และมีป้ายกติกา
- **dashboard:** filter หมวดกับ metrics ผ่าน selectors
- **หน้าจัดการหมวด:** เพิ่ม เปลี่ยนชื่อ ปิด และเปิด รวมการแสดง error ชื่อซ้ำ

## Out of Scope

- ตั้งอัตราค่าปรับหรือจำนวนครั้งแจ้งเตือนแยกต่อหมวด (ทุกหมวดใช้ V2 เหมือนกัน)
- UI สำหรับแก้ไขหรือสร้าง fine rule version ใหม่
- ลบหมวด
- เปลี่ยนหมวดของ violation ที่บันทึกแล้ว (ให้ยกเลิกแล้วสร้างใหม่)
- เก็บชื่อหมวด ณ เวลาที่เกิดเหตุ (snapshot)
- rename `ParkingViolation`, ตาราง และชื่อระบบ "Parking Log"
- ย้ายรอบ V1 ที่เปิดอยู่ไปใช้ V2 หรือปิดรอบเหล่านี้อัตโนมัติ
- แจ้งเตือนลูกบ้าน (SMS, LINE ฯลฯ) และรับชำระเงินจริง
- รายงานหรือ export แยกหมวด

## Further Notes

- `ADMIN` และ `STAFF` มีสิทธิ์จัดการหมวดเท่ากันตามที่ลูกค้ายืนยัน ต่างจากการจัดการผู้ใช้ที่ให้เฉพาะ `ADMIN`
- กติกา V2 ผูกกับ "รอบที่เปิดหลัง deploy" ไม่ได้ผูกกับ `occurredAt` ถ้าบันทึกย้อนหลังเหตุก่อน deploy ลงในรอบ V1 ที่ยังเปิดอยู่ จะคิดแบบ V1 แต่ถ้าลงในรอบใหม่ จะคิดแบบ V2
- ก่อน deploy production ควร backup DB และ dry-run migration กับ snapshot ข้อมูลจริง เพราะ migration เปลี่ยน unique key ของ cycles
- งานนี้แตกเป็น ticket ได้ด้วย `/to-tickets` ลำดับที่แนะนำ:
  1. schema และ migration พร้อม fine rule version
  2. API หมวด
  3. create violation รายหมวด
  4. shared types และ house list
  5. frontend หน้าจัดการหมวด
  6. frontend modal และ house detail
  7. frontend dashboard filter
  8. อัปเดต business rules doc

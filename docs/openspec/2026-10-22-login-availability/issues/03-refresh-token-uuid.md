# 03: refresh cookie ที่รูปแบบผิดต้องได้ 401

**What to build:** `parseRefreshToken` (`apps/backend/src/auth/auth.service.ts:375-384`) เช็กแค่ว่ามีสองส่วนคั่นด้วยจุด ถ้าส่วนแรกไม่ใช่ UUID จะส่งต่อไป `authSession.findUnique` บน column `@db.Uuid` ซึ่งน่าจะ throw แล้วได้ 500 และ cookie ไม่ถูกล้าง ให้ parser คืน `null` เมื่อ session id ไม่ใช่ UUID เพื่อให้ได้ `AUTH_INVALID_REFRESH` (401) และล้าง cookie ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-22-login-availability/spec.md`

**Blocked by:** none

**Status:** done

- [x] e2e ยืนยันพฤติกรรมเดิมก่อน: cookie `not-a-uuid.secret` ได้ 500 (ถ้าได้อย่างอื่น ให้บันทึกผลใน Comments)
- [x] `parseRefreshToken` เช็กรูปแบบ UUID ของส่วนแรก
- [x] e2e: cookie `not-a-uuid.secret` ได้ 401 `AUTH_INVALID_REFRESH` และ response ล้าง cookie

## Comments

- ก่อนแก้ e2e ได้ 500 "Internal Server Error" จริง ตรงกับที่ audit คาดไว้ ใช้ `isUUID` จาก class-validator ตัวเดียวกับที่ DTO ใช้

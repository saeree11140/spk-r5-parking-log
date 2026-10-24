# 02: ย้ายกฎ auth ไป beforeLoad

**What to build:** root route เรียก `ensureSession()` (เรียก `/auth/me` ครั้งเดียวแล้วเก็บ promise ไว้ใช้ซ้ำ) ผ่าน router context ระหว่างรอแสดง `pendingComponent` "กำลังตรวจสอบสิทธิ์" layout `_authenticated` redirect คนที่ยังไม่ login ไป `/login` และคนที่ต้องเปลี่ยนรหัสไป `/change-password` route `/login` และ `/change-password` redirect คนที่ login แล้วกลับ `/` route `/users` เช็ก ADMIN แล้วลบ `AuthGate` และการเช็กใน `users-page.tsx` ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-23-vite-tanstack-router/spec.md`

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] test ผ่าน router จริงครอบทุกกรณี redirect ที่ `auth-gate.spec.tsx` เคยครอบ และกรณี STAFF เข้า `/users`
- [ ] หน้าที่ต้อง redirect ไม่ render เนื้อหาก่อน redirect
- [ ] session หมดอายุ (401 ตอน refresh) ยังพากลับ `/login` ได้เหมือนเดิม
- [ ] logout แล้วกลับ `/login`
- [ ] หน้าที่ถูกกู้คืนจาก back/forward cache (`pageshow` ที่ `persisted = true`) ต้องตรวจ session ใหม่ก่อนแสดงเนื้อหา ถ้า session ไม่มีแล้วต้องไป `/login` และ test ด้วยการส่ง event `pageshow` ที่ `persisted = true`

## Comments

- พบตอนทดสอบ 01 บนเบราว์เซอร์: logout แล้วกด Back กลับมาเห็นหน้า `/` พร้อมชื่อ user เดิม ใช้ Playwright บน Chrome ที่เปิด bfcache ยืนยันได้ว่าได้ `pageshow` ที่ `persisted = true` และไม่มี request ไป backend เลย คือเบราว์เซอร์กู้ document เก่าที่ยัง login อยู่คืนมา เกิดเมื่อ Back ย้อนข้ามการโหลดหน้าใหม่ทั้งหน้า (เช่นเคยกด refresh หรือพิมพ์ URL เอง) ไม่ใช่ปัญหาที่เกิดจากการย้ายไป Vite: Next static export ก็เป็น SPA แบบเดียวกัน ฝั่ง backend ปลอดภัยเพราะ session ถูก revoke แล้ว แต่ข้อมูลเก่ายังแสดงบนจอ

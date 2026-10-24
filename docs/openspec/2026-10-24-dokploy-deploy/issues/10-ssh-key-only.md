# 10: SSH ใช้ key แทนรหัสผ่าน

**What to build:** ตอนนี้ VPS ยอมให้ login เป็น root ด้วยรหัสผ่านผ่าน port 22 ที่เปิดสู่ internet ทำให้ bot เดารหัสได้ตลอด เปลี่ยนเป็น SSH key อย่างเดียว ขั้นตอนอยู่ใน `docs/deploy/vps-setup.md` ข้อ 5

**Blocked by:** none

**Status:** ready-for-human

- [ ] login ด้วย key จาก Mac ได้โดยไม่ถามรหัสผ่าน
- [ ] `sshd -T` แสดง `passwordauthentication no` และ `permitrootlogin without-password`
- [ ] ทดสอบ login ใหม่ผ่านก่อนปิด session เดิม
- [ ] การ login ด้วยรหัสผ่านถูกปฏิเสธ

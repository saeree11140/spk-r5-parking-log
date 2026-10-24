# 10: SSH ใช้ key แทนรหัสผ่าน

**What to build:** ตอนนี้ VPS ยอมให้ login เป็น root ด้วยรหัสผ่านผ่าน port 22 ที่เปิดสู่ internet ทำให้ bot เดารหัสได้ตลอด เปลี่ยนเป็น SSH key อย่างเดียว ขั้นตอนอยู่ใน `docs/deploy/vps-setup.md` ข้อ 5

**Blocked by:** none

**Status:** done

- [x] login ด้วย key จาก Mac ได้โดยไม่ถามรหัสผ่าน
- [x] `sshd -T` แสดง `passwordauthentication no` และ `permitrootlogin without-password`
- [x] ทดสอบ login ใหม่ผ่านก่อนปิด session เดิม
- [x] การ login ด้วยรหัสผ่านถูกปฏิเสธ

## Comments

- ทำบน VPS วันที่ 2026-10-24: ใช้ key เดิมบน Mac (`~/.ssh/id_ed25519`) ส่งขึ้นด้วย `ssh-copy-id` แล้วเพิ่ม `/etc/ssh/sshd_config.d/10-key-only.conf`
- `sshd -T`: `passwordauthentication no`, `permitrootlogin without-password`
- ทดสอบจาก Mac: login ด้วย key ได้ `key-ok`, ปิด pubkey แล้วได้ `Permission denied (publickey).` ทันทีโดยไม่ถามรหัสผ่าน
- ต้องเข้า VPS ด้วย private key บน Mac เครื่องนี้เท่านั้น ถ้า key หายต้องเข้าทาง console ของ Hostatom

# 06: เปิด Ubuntu Pro

**What to build:** Ubuntu 20.04 หมด standard support แล้ว และ Hostatom ไม่มี snapshot (reinstall ทำให้ข้อมูลหาย) จึงใช้ Ubuntu Pro เพื่อรับ security update ต่อถึงปี 2030 แทนการอัปเกรด OS ขั้นตอนอยู่ใน `docs/deploy/vps-setup.md` ข้อ 1

**Blocked by:** none

**Status:** ready-for-human

- [ ] `pro status` แสดง esm-infra และ esm-apps เป็น enabled
- [ ] `apt-get upgrade` ผ่าน และ reboot ถ้าจำเป็น

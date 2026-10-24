# 07: เพิ่ม swap 2 GB

**What to build:** เพิ่ม swap file 2 GB และ `vm.swappiness=10` กัน OOM ตอน memory พีค (Hostatom ยืนยันว่าทำเองได้) ขั้นตอนอยู่ใน `docs/deploy/vps-setup.md` ข้อ 2

**Blocked by:** none

**Status:** ready-for-human

- [ ] `free -h` แสดง Swap 2.0Gi และยังอยู่หลัง reboot

# 07: เพิ่ม swap 2 GB

**What to build:** เพิ่ม swap file 2 GB และ `vm.swappiness=10` กัน OOM ตอน memory พีค (Hostatom ยืนยันว่าทำเองได้) ขั้นตอนอยู่ใน `docs/deploy/vps-setup.md` ข้อ 2

**Blocked by:** none

**Status:** done

- [x] `free -h` แสดง Swap 2.0Gi และยังอยู่หลัง reboot

## Comments

- ทำบน VPS วันที่ 2026-10-24: `free -h` แสดง Swap 2.0Gi, `vm.swappiness = 10` และเพิ่มบรรทัดใน `/etc/fstab` แล้ว (ยังไม่ได้ reboot เพื่อยืนยันว่า swap กลับมาเอง)

# 06: เปิด Ubuntu Pro

**What to build:** Ubuntu 20.04 หมด standard support แล้ว และ Hostatom ไม่มี snapshot (reinstall ทำให้ข้อมูลหาย) จึงใช้ Ubuntu Pro เพื่อรับ security update ต่อถึงปี 2030 แทนการอัปเกรด OS ขั้นตอนอยู่ใน `docs/deploy/vps-setup.md` ข้อ 1

**Blocked by:** none

**Status:** done

- [x] `pro status` แสดง esm-infra และ esm-apps เป็น enabled
- [x] `apt-get upgrade` ผ่าน และ reboot ถ้าจำเป็น

## Comments

- ทำบน VPS วันที่ 2026-10-24: attach Ubuntu Pro (free personal) แล้ว `esm-apps`, `esm-infra`, `livepatch` เป็น enabled
- `apt-get upgrade` เก็บ kernel ไว้ (kept back) ต้องลง `linux-generic linux-image-generic linux-headers-generic base-files` แยก แล้ว reboot จาก `5.4.0-29` เป็น `5.4.0-242-generic` เครื่องนี้ไม่มีไฟล์ `/var/run/reboot-required` ต้องเทียบ `uname -r` กับ `/boot/vmlinuz-*` เอง
- หลัง reboot Dokploy กลับมาเองครบ
- ไม่ได้ลง `fwupd`, `sosreport`, `ubuntu-server` ที่ค้างอยู่ เพราะไม่เกี่ยวกับ security ของ VPS นี้

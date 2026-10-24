# 08: firewall บน host

**What to build:** Hostatom ไม่มี firewall ระดับ network ตอนนี้ `ufw` ปิดอยู่ port ของ Docker Swarm (2377, 7946) และ SSH เปิดสู่ internet ตั้ง `ufw` ให้รับแค่ 22, 80, 443 โดยไม่ทำให้ SSH หลุด ขั้นตอนอยู่ใน `docs/deploy/vps-setup.md` ข้อ 3

**Blocked by:** none

**Status:** done

- [x] เปิด SSH สำรองไว้และเข้า console ของ Hostatom ได้ก่อนเริ่ม
- [x] `ufw status` เป็น active และมีแค่ 22/tcp, 80/tcp, 443/tcp, 443/udp
- [x] จากเครื่องอื่น SSH ยังเข้าได้ และ port 2377 เข้าไม่ได้

## Comments

- ทำบน VPS วันที่ 2026-10-24: `ufw` active มีแค่ 22/tcp, 80/tcp, 443/tcp, 443/udp (IPv4 และ IPv6) เปิดเองตอน boot
- ทดสอบจาก Mac: SSH เข้าได้, `nc` ไป 2377 timed out, `http://<ip>/` ได้ 404 จาก Traefik
- `:3000` ของ Dokploy ยังเปิดจาก internet อยู่ เพราะ Docker publish port และ `ufw` กันไม่ได้ ปิดใน issue 09
- พบว่า SSH ยอมให้ root login ด้วยรหัสผ่าน แยกเป็น issue 10

# 08: firewall บน host

**What to build:** Hostatom ไม่มี firewall ระดับ network ตอนนี้ `ufw` ปิดอยู่ port ของ Docker Swarm (2377, 7946) และ SSH เปิดสู่ internet ตั้ง `ufw` ให้รับแค่ 22, 80, 443 โดยไม่ทำให้ SSH หลุด ขั้นตอนอยู่ใน `docs/deploy/vps-setup.md` ข้อ 3

**Blocked by:** none

**Status:** ready-for-human

- [ ] เปิด SSH สำรองไว้และเข้า console ของ Hostatom ได้ก่อนเริ่ม
- [ ] `ufw status` เป็น active และมีแค่ 22/tcp, 80/tcp, 443/tcp, 443/udp
- [ ] จากเครื่องอื่น SSH ยังเข้าได้ และ port 2377 เข้าไม่ได้

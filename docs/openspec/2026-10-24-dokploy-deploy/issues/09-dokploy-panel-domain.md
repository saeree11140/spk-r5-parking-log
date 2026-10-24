# 09: หน้า Dokploy ผ่าน HTTPS แล้วปิด :3000

**What to build:** ตั้งโดเมน `panel.<domain>` พร้อม HTTPS ให้หน้า admin ของ Dokploy แล้วปิด `:3000` จาก internet ด้วยกฎใน chain `DOCKER-USER` (`ufw` กัน port ที่ Docker publish ไม่ได้) ขั้นตอนอยู่ใน `docs/deploy/vps-setup.md` ข้อ 4

**Blocked by:** 08 และต้องมีโดเมน

**Status:** ready-for-human

- [ ] `https://panel.<domain>` login ได้
- [ ] `http://<ip>:3000` จากเครื่องอื่น timeout
- [ ] กฎยังอยู่หลัง reboot

# 09: หน้า Dokploy ผ่าน HTTPS แล้วปิด :3000

**What to build:** ตั้งโดเมน `panel.<domain>` พร้อม HTTPS ให้หน้า admin ของ Dokploy แล้วปิด `:3000` จาก internet ด้วยกฎใน chain `DOCKER-USER` (`ufw` กัน port ที่ Docker publish ไม่ได้) ขั้นตอนอยู่ใน `docs/deploy/vps-setup.md` ข้อ 4

**Blocked by:** 08 และต้องมีโดเมน

**Status:** done

- [x] `https://panel.<domain>` login ได้
- [x] `http://<ip>:3000` จากเครื่องอื่น timeout
- [x] กฎยังอยู่หลัง reboot

## Comments

- 2026-10-24: โดเมนคือ `panel.spkr5.com` กด Save ใน Settings > Web Server ครั้งแรกได้ 400 และไม่มีอะไรถูกเขียนลง `/etc/dokploy/traefik/dynamic/dokploy.yml` เพราะ Dokploy ที่มากับเครื่องเป็น image build เมื่อ 2025-05-28 อัปเดตด้วย `curl -sSL https://dokploy.com/install.sh | sh -s update` (image 2026-10-22) แล้ว Save ผ่าน cert Let's Encrypt ออกทันที (chain `YR2` > `Root YR` > `ISRG Root X1`) หลัง Save หน้าเว็บขึ้น 500 ตอน Traefik reload ไม่มีผล
- 2026-10-24: เพิ่มกฎ `DOCKER-USER` ใน `/etc/ufw/after.rules` (interface `eth0`) แล้ว `ufw reload` จากภายนอก `:3000` timeout และ `https://panel.spkr5.com` ได้ 200
- Chrome ที่เคยกดผ่าน cert `TRAEFIK DEFAULT CERT` ยังขึ้น "Not Secure" ทั้งที่ cert valid ต้องปิด Chrome ทั้งโปรแกรม error เรื่อง Stripe ใน Console มาจากโค้ด billing ของ Dokploy ไม่เกี่ยวกัน
- 2026-10-25: หลัง reboot กฎ `DROP ... ctorigdstport 3000` ยังอยู่ใน `DOCKER-USER` จากภายนอก `:3000` timeout และ panel, `/api/health`, หน้าเว็บได้ 200 ทั้งหมด

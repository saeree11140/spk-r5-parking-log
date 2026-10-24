# ตั้งค่า VPS ก่อน deploy

เครื่อง: Hostatom VPS, Ubuntu 20.04, x86_64, 1 vCPU, RAM 1.9 GB, disk 20 GB, มี Dokploy (Docker Swarm + Traefik) อยู่แล้ว
Hostatom ไม่มี firewall ระดับ network, ไม่มี snapshot/backup และ reinstall OS ทำให้ข้อมูลหายทั้งหมด (ticket #JHJ-806230)

ทำตามลำดับ ทุกคำสั่งรันบน VPS ด้วย root หรือ `sudo`

## 1. Ubuntu Pro (security update ต่อถึงปี 2030)

Ubuntu 20.04 หมด standard support แล้ว อัปเกรด OS เองเสี่ยงเพราะไม่มี snapshot ให้ย้อนกลับ ใช้ Ubuntu Pro (ฟรีสำหรับใช้ส่วนตัวไม่เกิน 5 เครื่อง) แทน

1. สมัครที่ https://ubuntu.com/pro แล้ว copy token จากหน้า dashboard **ห้ามส่ง token ให้ใครหรือใส่ใน repo**
2. บน VPS:

   ```bash
   apt-get update && apt-get install -y ubuntu-advantage-tools
   pro attach <token>
   pro status          # esm-infra และ esm-apps ต้องเป็น enabled
   apt-get update && apt-get upgrade -y
   ```

3. ถ้า upgrade มี kernel ใหม่ (`/var/run/reboot-required` มีอยู่) ให้ reboot ตอนที่ไม่มีคนใช้งาน Dokploy และ container จะกลับมาเอง

## 2. Swap 2 GB

RAM ว่างราว 1.1 GB และไม่มี swap ถ้า memory หมด kernel จะ kill process ทันที

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
sysctl -p /etc/sysctl.d/99-swappiness.conf
free -h             # บรรทัด Swap ต้องเป็น 2.0Gi
```

## 3. Firewall บน host (`ufw`)

**คำเตือน:** ถ้าเปิด `ufw` โดยไม่ allow port 22 ก่อน SSH จะหลุดทันทีและเข้าเครื่องไม่ได้อีก ก่อนเริ่ม:

- เปิด SSH ค้างไว้อีกหน้าต่างหนึ่ง และอย่าปิดจนกว่าจะทดสอบเสร็จ
- เช็กว่าเข้า console ของ VPS จากหน้าจัดการของ Hostatom ได้ ถ้า SSH หลุดให้เข้าทาง console แล้วรัน `ufw disable`

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw show added      # ต้องเห็น 22/tcp ก่อน enable
ufw enable
ufw status verbose
```

ทดสอบจาก**เครื่องของคุณ** (ไม่ใช่บน VPS) ระหว่างที่ SSH หน้าต่างเดิมยังเปิดอยู่:

```bash
ssh root@<ip> 'echo ok'          # ต้องได้ ok
nc -vz -w 3 <ip> 2377            # ต้อง timeout หรือ refused
```

`ufw` กันได้เฉพาะ process บน host เช่น Docker Swarm (`2377`, `7946`) แต่**กัน port ที่ Docker publish ไม่ได้** เช่นหน้า Dokploy `:3000` เพราะ Docker ใส่กฎ iptables ของตัวเองไว้ก่อน `ufw` การปิด `:3000` อยู่ในขั้นที่ 4

## 4. โดเมนของหน้า Dokploy แล้วปิด `:3000`

ตอนนี้หน้า admin ของ Dokploy เปิดเป็น HTTP ธรรมดาที่ `http://<ip>:3000` ใครก็เห็นหน้า login และรหัสผ่านวิ่งแบบไม่เข้ารหัส

1. ตั้ง A record `panel.<domain>` ชี้ไปที่ IP ของ VPS
2. Dokploy > Settings > Web Server (หรือ Server) > ตั้ง Domain เป็น `panel.<domain>` เปิด HTTPS ด้วย Let's Encrypt
3. เปิด `https://panel.<domain>` แล้ว login ให้ได้ก่อน **ห้ามทำข้อ 4 ถ้ายังเข้าทาง HTTPS ไม่ได้**
4. หาชื่อ network interface ที่ต่อ internet:

   ```bash
   ip route get 1.1.1.1 | grep -o 'dev [^ ]*'     # เช่น dev eth0
   ```

5. เพิ่มกฎใน chain `DOCKER-USER` ท้ายไฟล์ `/etc/ufw/after.rules` (แทน `eth0` ด้วยชื่อจากข้อ 4) กฎนี้ทิ้งเฉพาะ traffic จาก internet ที่ตรงไป port 3000 ส่วน Traefik ที่คุยกับ Dokploy ภายใน network ของ Docker ไม่โดน:

   ```
   *filter
   :DOCKER-USER - [0:0]
   -A DOCKER-USER -i eth0 -p tcp -m conntrack --ctorigdstport 3000 --ctdir ORIGINAL -j DROP
   -A DOCKER-USER -j RETURN
   COMMIT
   ```

6. โหลดกฎและทดสอบ:

   ```bash
   ufw reload
   ```

   จากเครื่องของคุณ: `curl -m 5 http://<ip>:3000` ต้อง timeout และ `https://panel.<domain>` ยังเข้าได้

ถ้าเข้า `https://panel.<domain>` ไม่ได้หลังข้อ 6 ให้ลบ block ที่เพิ่มใน `/etc/ufw/after.rules` แล้ว `ufw reload`

## 5. ตรวจหลังตั้งค่า

```bash
ss -tlnp            # 80, 443 ยัง docker-proxy, 22 ยัง sshd
free -h             # มี swap
pro status          # esm-infra enabled
docker service ls   # dokploy, dokploy-postgres, dokploy-redis 1/1
```

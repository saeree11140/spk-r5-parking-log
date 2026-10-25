# Deploy บน Dokploy

คู่มือนี้พาระบบขึ้น VPS ที่ติดตั้ง Dokploy แล้ว ระบบมี 3 service ใน Dokploy project เดียว:

| Service | ประเภท | Image |
|---|---|---|
| `spk-r5-db` | Database (PostgreSQL) | `postgres:18.4-alpine3.23` |
| `spk-r5-backend` | Application (Docker image) | `ghcr.io/saeree11140/spk-r5-parking-log-backend:latest` |
| `spk-r5-frontend` | Application (Docker image) | `ghcr.io/saeree11140/spk-r5-parking-log-frontend:latest` |

Image ถูก build โดย GitHub Actions ทุกครั้งที่ push `main` (`.github/workflows/ci.yml`) ห้าม build บน VPS เพราะเครื่องมี 1 vCPU และ RAM 1.9 GB

ชื่อเมนูใน Dokploy อาจต่างไปเล็กน้อยตามเวอร์ชัน (ทดสอบกับ v0.30.10) ค่าที่เขียนเป็น `<...>` ต้องแทนด้วยค่าจริง

Dokploy ตั้งชื่อ service ใน Docker เป็นชื่อ project ต่อชื่อ service แบบตัดขีดออก แล้วต่อท้ายด้วยตัวสุ่ม เช่น `spkr5parkinglog-spkr5backend-11ybqb` คำสั่งในคู่มือนี้จึงหา container ด้วย `name=spkr5parkinglog-spkr5backend` ถ้าตั้งชื่อ project หรือ service ต่างจากนี้ให้ดูชื่อจริงด้วย `docker service ls`

## ก่อนเริ่ม

- Image ทั้งสองอยู่ใน GHCR และเป็น public (GitHub > Packages > package > Package settings > Change visibility) ถ้ายังเป็น private ต้องเพิ่ม registry `ghcr.io` ใน Dokploy พร้อม token ที่มีสิทธิ์ `read:packages`
- มีโดเมนที่ชี้ A record มาที่ IP ของ VPS เช่น `parking.<domain>` ระหว่างยังไม่มีโดเมนใช้ `<ip>.sslip.io` ทดสอบได้
- ทำขั้นตอนตั้งค่าเครื่องใน `docs/deploy/vps-setup.md` แล้ว (Ubuntu Pro, swap, firewall)

## 1. Database

1. สร้าง project ใหม่ชื่อ `spk-r5-parking-log`
2. ใน project สร้าง Database > PostgreSQL ชื่อ `spk-r5-db`
   - Docker image: `postgres:18.4-alpine3.23`
   - Database name: `spk_r5_parking_log`
   - User: `spk_r5`
   - Password: ให้ Dokploy สุ่ม หรือสร้างด้วย `openssl rand -hex 24`
3. **ห้ามตั้ง External Port** ฐานข้อมูลต้องคุยได้เฉพาะภายใน network ของ Dokploy (เลข `5432` สีเทาในช่องเป็นแค่ placeholder อย่ากด Save ของส่วน External Credentials)
4. Advanced > Resources: Memory Limit `268435456` (256 MB กรอกเป็น byte) ช่องอื่นปล่อยว่าง แล้วกด Save ของส่วนนั้น
5. Advanced > Advanced Settings: ช่อง Command ปล่อยว่าง กด Add Argument ทีละช่องให้ได้ `postgres`, `-c`, `shared_buffers=64MB`, `-c`, `max_connections=20` แล้วกด Save
6. Deploy แล้วตรวจ:

   ```bash
   DB=$(docker ps -q -f name=spkr5parkinglog-spkr5db | head -1)
   docker exec "$DB" psql -U spk_r5 -d spk_r5_parking_log -c "SHOW shared_buffers" -c "SHOW max_connections"   # 64MB, 20
   docker inspect "$DB" --format '{{.HostConfig.Memory}}'                                                # 268435456
   ```

## 2. Backend

1. สร้าง Application ชื่อ `spk-r5-backend` แล้วใน General > Provider เลือกแท็บ Docker
   - Docker image: `ghcr.io/saeree11140/spk-r5-parking-log-backend:latest` ช่อง Registry URL, Username, Password ปล่อยว่าง
   - กด Save ของกล่อง Provider แล้ว reload หน้าดูว่ายังเป็นแท็บ Docker ถ้าไม่ได้ Save ตอน Deploy จะขึ้น `Github Provider not found` ส่วน Build Type ไม่ต้องแตะ
2. Environment:

   | ตัวแปร | ค่า | Secret |
   |---|---|---|
   | `DATABASE_URL` | Internal Connection URL จากขั้นที่ 1 (กดปุ่ม copy ข้างช่อง) | ใช่ |
   | `NODE_ENV` | `production` | |
   | `BACKEND_PORT` | `3001` | |
   | `FRONTEND_URL` | `https://parking.<domain>` ตรงทุกตัวอักษร ไม่มี `/` ท้าย | |
   | `COOKIE_SECURE` | `true` | |
   | `TRUST_PROXY_HOPS` | `1` (Traefik เป็น proxy ชั้นเดียวหน้า backend) | |
   | `JWT_ACCESS_SECRET` | `openssl rand -hex 32` | ใช่ |
   | `AUTH_TOKEN_PEPPER` | `openssl rand -hex 32` คนละค่ากับข้างบน | ใช่ |

   ค่าต้องไม่มีเครื่องหมายคำพูดหรือ `<...>` ค้าง ถ้า `DATABASE_URL` ผิด log จะขึ้น `P1013: The provided database string is invalid` ตรวจค่าที่ container ได้รับโดยซ่อนรหัสผ่าน:

   ```bash
   docker service inspect <ชื่อ service backend> --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' \
     | sed -E 's#(://[^:]*:)[^@]*@#\1***@#; s#^(JWT_ACCESS_SECRET|AUTH_TOKEN_PEPPER)=.*#\1=<hidden>#'
   ```

   ถ้าเปิด proxy ของ Cloudflare (เมฆสีส้ม) จะมี proxy เพิ่มอีกชั้น ต้องคิด `TRUST_PROXY_HOPS` และการอ่าน IP ใหม่ ให้ใช้โหมด DNS only
3. Domains: เพิ่ม
   - Host: `parking.<domain>`
   - Path: `/api`
   - Internal Path: `/`
   - **Strip Path: ปิด** (backend ใช้ prefix `/api` เอง)
   - Container Port: `3001`
   - HTTPS: เปิด, Certificate: Let's Encrypt
4. Advanced > Resources: Memory Limit `384 MB` (`402653184` byte) ตอนว่างใช้ราว 150 MB ที่เหลือเผื่อ argon2 ตอน login พร้อมกัน
5. Deploy แล้วดู Logs ต้องเห็น `No pending migrations to apply` หรือรายการ `Applying migration` แล้วตามด้วย Nest เริ่มทำงาน Container รัน `prisma migrate deploy` เองทุกครั้งที่ start

## 3. Frontend

1. สร้าง Application ชื่อ `spk-r5-frontend` เลือก Provider: Docker แล้วกด Save ของกล่อง Provider เหมือน backend
   - Docker image: `ghcr.io/saeree11140/spk-r5-parking-log-frontend:latest`
2. ไม่ต้องตั้ง environment frontend เรียก API ที่ `/api` บนโดเมนเดียวกันเสมอ
3. Domains: เพิ่ม
   - Host: `parking.<domain>`
   - Path: `/`
   - Internal Path: `/`
   - Container Port: `8080`
   - HTTPS: เปิด, Certificate: Let's Encrypt
4. Advanced > Resources: Memory Limit `32 MB` (`33554432` byte)
5. Deploy

Traefik เลือก router ที่ rule ยาวกว่าก่อน ฉะนั้น `parking.<domain>/api/*` ไป backend และ path อื่นทั้งหมดไป frontend frontend กับ API จึงอยู่ origin เดียวกันตามที่ CSRF ต้องการ

ตรวจหลัง deploy:

```bash
curl -s https://parking.<domain>/api/health          # {"status":"ok",...}
curl -sI https://parking.<domain>/houses/R5-001       # 200, Content-Security-Policy, Cache-Control: no-cache
```

## 4. Seed ครั้งแรก (ทำครั้งเดียว)

Seed สร้างบ้าน R5-001 ถึง R5-164, หมวดการกระทำผิดเริ่มต้น และ ADMIN คนแรก รันซ้ำได้โดยไม่ทับข้อมูลเดิม แต่ไม่ต้องรันอีกหลังครั้งแรก

ไม่เก็บ `ADMIN_PASSWORD` ไว้ใน environment ของ service ให้ส่งเฉพาะตอนรันบน VPS พิมพ์บรรทัด `read` ทีละบรรทัด (ถ้าวางหลายบรรทัดพร้อมกัน `read` จะรับบรรทัดถัดไปเป็นค่า):

```bash
read -r  ADMIN_USERNAME          # เช่น admin
read -rs ADMIN_PASSWORD          # 12–128 ตัว มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข (ไม่แสดงบนจอ)
read -r  ADMIN_DISPLAY_NAME
export ADMIN_USERNAME ADMIN_PASSWORD ADMIN_DISPLAY_NAME

BACKEND=$(docker ps -q -f name=spkr5parkinglog-spkr5backend | head -1)
docker exec -e ADMIN_USERNAME -e ADMIN_PASSWORD -e ADMIN_DISPLAY_NAME "$BACKEND" node dist/scripts/seed.js

unset ADMIN_USERNAME ADMIN_PASSWORD ADMIN_DISPLAY_NAME
```

seed ที่สำเร็จจะไม่พิมพ์อะไร ถ้าล้มจะขึ้น `Database seed failed:`

Login ครั้งแรก ระบบบังคับให้ ADMIN เปลี่ยนรหัสผ่าน

## 5. ล้าง session ที่หมดอายุวันละครั้ง

ใน `spk-r5-backend` > Schedules เพิ่มงาน:

- Task Name: `cleanup-auth-sessions`
- Schedule: Custom `0 3 * * *`
- Timezone: `Asia/Bangkok`
- Shell Type: `Sh`
- Command: `node dist/scripts/cleanup-auth-sessions.js && echo cleanup-ok`

script ไม่พิมพ์อะไรเมื่อสำเร็จ `echo cleanup-ok` ทำให้ log ของแต่ละรอบบอกได้ว่ารันจบโดยไม่มี error กด Run ทดสอบหนึ่งครั้ง log ต้องมี `cleanup-ok` (บรรทัด `docker exec ... sh -c node ...` ใน log ไม่มีเครื่องหมายคำพูดแต่เป็นแค่ข้อความแสดงผล Dokploy ส่ง command ทั้งก้อนเป็นอาร์กิวเมนต์เดียว)

ถ้าไม่มีเมนู Schedules ใช้ cron บน host (`sudo crontab -e`):

```cron
0 3 * * * docker exec $(docker ps -q -f name=spkr5parkinglog-spkr5backend | head -1) node dist/scripts/cleanup-auth-sessions.js
```

## Deploy เวอร์ชันใหม่

1. Merge เข้า `main` แล้ว push
2. รอ GitHub Actions ผ่านทั้ง job `check` และ `images`
3. Dokploy > `spk-r5-backend` > Deploy แล้ว `spk-r5-frontend` > Deploy

Migration ใหม่ถูก apply เองตอน backend start ถ้าจะย้อนเวอร์ชัน ให้เปลี่ยน image tag จาก `latest` เป็น `sha-<commit>` ของเวอร์ชันก่อนแล้ว Deploy (migration ที่ apply ไปแล้วจะไม่ถูกย้อน ต้องดูว่าเวอร์ชันเก่ายังใช้ schema ใหม่ได้)

Image ของ backend ใหญ่ราว 600 MB และ disk ของ VPS มีจำกัด ให้ลบ image เก่าเป็นระยะ:

```bash
docker image prune -a --filter "until=168h"
```

## ปลดล็อกบัญชีฉุกเฉิน

ถ้า ADMIN คนเดียวถูกล็อก:

```bash
docker exec $(docker ps -q -f name=spkr5parkinglog-spkr5backend | head -1) node dist/scripts/unlock-user.js <username>
```

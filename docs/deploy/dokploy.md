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

## 6. Backup ฐานข้อมูล

มี 2 ชุด: Dokploy ส่งขึ้น Backblaze B2 ทุกวัน 02:00 เวลาไทย และ script บน VPS เก็บไว้ในเครื่อง 7 วัน ทุกวัน 02:30 ไฟล์ใน B2 ถูกซ่อนเมื่ออายุ 30 วันและลบจริงหลังซ่อน 30 วัน key ที่ให้ Dokploy ลบไฟล์ไม่ได้ ถ้ามีคนเจาะ VPS ได้ก็ลบ backup ใน B2 ไม่ได้

### B2

1. สมัคร Backblaze B2 แล้วสร้าง bucket แบบ Private, Object Lock: Disable
2. Bucket > Lifecycle Settings > Use custom lifecycle rules: File Path ว่าง, Days Till Hide `30`, Days Till Delete `30`
3. สร้าง key บน Mac ด้วย `b2` CLI **ห้ามสร้างจากหน้าเว็บ** แบบ Read and Write ของหน้าเว็บมี `deleteFiles` และ `writeBucketLifecycleRules` ติดมาเสมอ:

   ```bash
   brew install b2-tools
   b2 account authorize                 # keyID และ applicationKey ของ Master ผลมี key ห้ามแปะที่ไหน
   b2 key create --bucket <bucket> dokploy-<project>-nodelete listBuckets,listFiles,readFiles,writeFiles
   b2 account clear
   ```

   ผล `key create` เป็นบรรทัดเดียว: ค่าแรกคือ Access Key ID (25 ตัว) ค่าที่สองคือ Secret (`K005...`) แสดงครั้งเดียว จดใน password manager ทันที

4. B2 S3 API ไม่รับ Master key (`InvalidAccessKeyId: Malformed Access Key Id`) ถ้า Master key หลุด ให้ App Keys > Generate New Master Application Key key อื่นยังใช้ได้

### Dokploy

1. Settings > S3 Destinations > Add: Provider `Other`, Access Key ID/Secret จากข้อ 3, Bucket, Region เช่น `us-east-005`, Endpoint เช่น `https://s3.us-east-005.backblazeb2.com` กด Test (Dokploy รัน `rclone ls`) แล้วกด Create ถ้า Test ล้ม ข้อความ error มี secret อยู่ อย่าแปะทั้งก้อน
2. `spk-r5-db` > Backups > Create Backup: Destination ที่สร้าง, Database `spk_r5_parking_log`, Schedule `0 19 * * *` (Dokploy ใช้ UTC = 02:00 เวลาไทย), Prefix `daily/`, Keep the latest **ว่าง** (key ลบไฟล์ไม่ได้) ถ้าเลือก Destination แล้วช่องยังแสดง "Select Destination" กด Create ได้เลย
3. กด ▶ ไฟล์จะอยู่ที่ `<ชื่อ service ฐานข้อมูล>/daily/<เวลา>.sql.gz` เป็น `pg_dump -Fc` ที่ gzip อีกชั้น
4. แจ้งเตือน: Settings > Notifications > Email ผ่าน Gmail SMTP (`smtp.gmail.com:587`, Username/From/To เป็นบัญชี Gmail, Password เป็น App Password จาก `myaccount.google.com/apppasswords`) ช่อง SMTP Server ใส่แค่ `smtp.gmail.com` และ Port `587` แยกกัน App Password ไม่มีช่องว่าง (รหัสผ่าน Gmail ปกติได้ `534-5.7.9 Application-specific password required`) เปิด action Database Backup และ Dokploy Restart ได้อีเมล "Database backup for dokploy" ทั้งสำเร็จและล้ม ตั้ง Gmail filter Subject `Database backup` ติด label วันไหนไม่มีอีเมลแปลว่ามีปัญหา

### บน VPS

script อยู่ที่ `deploy/backup/spk-r5-local-backup.sh` รัน `pg_dump -Fc` ใน container ของฐานข้อมูล (ใช้ `POSTGRES_USER`/`POSTGRES_DB` ที่ Dokploy ตั้งไว้) ลง `/var/backups/spk-r5/` สิทธิ์ `600` และลบไฟล์อายุ 7 วันขึ้นไป จากเครื่องที่มี repo:

```bash
ssh root@<ip> 'cat > /usr/local/sbin/spk-r5-local-backup && chmod 700 /usr/local/sbin/spk-r5-local-backup' < deploy/backup/spk-r5-local-backup.sh
ssh root@<ip> /usr/local/sbin/spk-r5-local-backup     # ต้องได้ "wrote ... bytes"
```

แล้วเพิ่มใน `crontab -e` ของ root (เครื่องตั้ง timezone เป็น `Asia/Bangkok` ดู `docs/deploy/vps-setup.md` ข้อ 7):

```cron
30 2 * * * /usr/local/sbin/spk-r5-local-backup >> /var/log/spk-r5-local-backup.log 2>&1
```

## Deploy เวอร์ชันใหม่

push เข้า `main` แล้ว GitHub Actions deploy ให้เอง: job `check` และ `images` ผ่านแล้ว job `deploy` จะ

1. อ่าน commit ที่ prod รันอยู่จาก `/api/health` (`"version"`) และ `/version.txt` (CI ใส่ commit SHA ลง image เป็น build arg `APP_VERSION`)
2. `git diff` จาก commit นั้นถึง commit ปัจจุบัน deploy เฉพาะ service ที่ไฟล์ของมันเปลี่ยน (`apps/<service>`, `packages/shared-types`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.dockerignore`) อ่าน version ไม่ได้ให้ deploy ไว้ก่อน แก้แค่ `docs/` จึงไม่ deploy
3. ยิง webhook ของ backend รอจน `/api/health` ตอบ version ใหม่ (นานสุด 5 นาที) แล้วจึงทำแบบเดียวกันกับ frontend ไม่ตรงหรือ webhook ไม่ได้ 200 job เป็นสีแดง GitHub ส่งอีเมล ดูสาเหตุที่ Deployments ของ service ใน Dokploy

ตั้งค่าครั้งเดียว:

1. Dokploy > `spk-r5-backend` และ `spk-r5-frontend` > General: เปิด **Autodeploy** (ปิดอยู่ webhook ได้ 400)
2. แต่ละ service > แท็บ Deployments: คัดลอก **Webhook URL** (`https://panel.<domain>/api/deploy/<token>` ใครได้ URL ก็สั่ง deploy ได้ เก็บเป็นความลับ)
3. GitHub > repo > Settings > Environments > New environment `production` (ไม่ต้องตั้ง reviewer) > Add environment secret:
   - `DOKPLOY_BACKEND_WEBHOOK`: Webhook URL ของ backend
   - `DOKPLOY_FRONTEND_WEBHOOK`: Webhook URL ของ frontend

ถ้า URL หลุด กด Refresh token ในแท็บ Deployments แล้วอัปเดต secret

deploy เองด้วยมือยังทำได้: `spk-r5-backend` > Deploy แล้ว `spk-r5-frontend` > Deploy (backend ก่อนเสมอ)

ย้อนเวอร์ชัน: เปลี่ยน Docker Image ของ service จาก `:latest` เป็น `:sha-<commit>` ของเวอร์ชันก่อน (ดูได้ที่ GitHub > Packages) แล้ว Deploy เช็กด้วย `/api/health` ว่า `version` เป็น commit นั้น migration ที่ apply ไปแล้วจะไม่ถูกย้อน ต้องดูว่าเวอร์ชันเก่ายังใช้ schema ใหม่ได้ ไม่ได้ให้ restore ตามหัวข้อ "กู้ข้อมูล prod" ระหว่างที่ตั้งเป็น `:sha-...` job `deploy` ของ push ถัดไปจะล้มเพราะ version ไม่ตรง แก้เสร็จให้เปลี่ยนกลับเป็น `:latest` ก่อน merge

Image ของ backend ใหญ่ราว 600 MB และ disk ของ VPS มีจำกัด เปิด Settings > Web Server > Daily Docker Cleanup ไว้ Dokploy จะรัน `docker container prune`, `docker image prune --all` และ `docker system prune --all` ทุกวัน 23:50 UTC (06:50 เวลาไทย) container ที่หยุดอยู่และ image ที่ไม่มี container ใช้จะถูกลบ

## ปลดล็อกบัญชีฉุกเฉิน

ถ้า ADMIN คนเดียวถูกล็อก:

```bash
docker exec $(docker ps -q -f name=spkr5parkinglog-spkr5backend | head -1) node dist/scripts/unlock-user.js <username>
```

## Restore

ทั้งสองแบบใช้ `pg_restore` ไฟล์จาก B2 ต้อง `gunzip -c` ก่อน ไฟล์บน VPS ไม่ต้อง

### ซ้อม restore (ทุก 3 เดือน ไม่แตะ prod)

ไฟล์บน VPS:

```bash
F=$(ls -t /var/backups/spk-r5/*.dump | head -1)
docker run -d --rm --name restore-test -m 256m -e POSTGRES_PASSWORD=drill postgres:18.4-alpine3.23
until docker exec restore-test pg_isready -U postgres; do sleep 1; done; sleep 3
docker exec -i restore-test pg_restore -U postgres -d postgres --no-owner --no-acl < "$F" && echo restore-ok
docker exec restore-test psql -U postgres -Atc "SELECT count(*) FROM houses"   # เทียบกับ prod
docker stop restore-test
```

ไฟล์จาก B2: ดาวน์โหลดจาก Browse Files มาที่เครื่องที่มี Docker แล้วใช้คำสั่งเดียวกันแต่เปลี่ยนบรรทัด restore เป็น `gunzip -c <ไฟล์>.sql.gz | docker exec -i restore-test pg_restore ...` ลบไฟล์ที่ดาวน์โหลดทิ้งหลังซ้อม (มี hash รหัสผ่าน)

นับแถวของ `houses`, `violation_categories`, `parking_violations`, `fines`, `users`, `audit_logs`, `_prisma_migrations` เทียบกับ prod ถ้าตรงกันแปลว่าไฟล์ใช้ได้ (`audit_logs` ของ prod อาจมากกว่าถ้ามีคน login หลังเวลาของไฟล์)

### กู้ข้อมูล prod

**ข้อมูลใน prod หลังเวลาของไฟล์ backup จะหายทั้งหมด** ทำเมื่อข้อมูลเสียหายจริงเท่านั้น

1. หยุดการเขียน: `spk-r5-backend` > Stop
2. backup สภาพปัจจุบันไว้ก่อน: `/usr/local/sbin/spk-r5-local-backup`
3. restore ทับ (ไฟล์บน VPS):

   ```bash
   DB=$(docker ps -q -f name=spkr5parkinglog-spkr5db | head -1)
   docker exec -i "$DB" sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl' < /var/backups/spk-r5/<ไฟล์>.dump
   ```

   ไฟล์จาก B2: ใช้ `spk-r5-db` > Backups > Restore Backup ของ Dokploy หรือ copy ไฟล์ขึ้น VPS แล้ว `gunzip -c <ไฟล์> | docker exec -i "$DB" sh -c '...'` แบบเดียวกัน
4. `spk-r5-backend` > Deploy (migrate deploy รันเองถ้า schema ในไฟล์เก่ากว่า) แล้วเช็ก `/api/health` และ login

## กู้ระบบเมื่อ VPS หายทั้งเครื่อง

1. VPS ใหม่: ทำ `docs/deploy/vps-setup.md` ทั้งหมดและติดตั้ง Dokploy
2. Cloudflare: เปลี่ยน A record `parking` และ `panel` เป็น IP ใหม่ (DNS only)
3. ทำข้อ 1–3 ของคู่มือนี้ (Database, Backend, Frontend) ใช้ secret ชุดใหม่ได้ ผู้ใช้ทุกคนต้อง login ใหม่ **ข้ามข้อ 4 Seed**
4. ดาวน์โหลดไฟล์ล่าสุดจาก B2 แล้ว restore ตาม "กู้ข้อมูล prod" ข้อ 1, 3, 4
5. ตั้ง backup ข้อ 6 ใหม่ (destination ใช้ key `-nodelete` เดิมได้) และ cleanup schedule ข้อ 5

## ดูฐานข้อมูลจากเครื่องตัวเอง (DBeaver)

ฐานข้อมูลไม่เปิด port ออก internet ใช้ container `db-tunnel` บน VPS ที่เปิด `127.0.0.1:15432` ส่งต่อไปยังฐานข้อมูล แล้วให้ DBeaver ต่อผ่าน SSH

cron ของ root สร้าง tunnel 07:00 และลบ 00:00 (เวลาไทย) ใช้สร้าง/ลบแทน start/stop เพราะ Daily Docker Cleanup ลบ container ที่หยุดอยู่ตอน 06:50:

```cron
0 7 * * * /usr/bin/docker rm -f db-tunnel >/dev/null 2>&1; /usr/bin/docker run -d --name db-tunnel --restart unless-stopped --network dokploy-network -p 127.0.0.1:15432:5432 alpine/socat tcp-listen:5432,fork,reuseaddr tcp-connect:spkr5parkinglog-spkr5db-cclaxl:5432 >/dev/null 2>&1
0 0 * * * /usr/bin/docker rm -f db-tunnel >/dev/null 2>&1
```

**ห้ามลบ `127.0.0.1:` ออกจาก `-p`** ไม่งั้นฐานข้อมูลเปิดออก internet (`ufw` กัน port ที่ Docker publish ไม่ได้) ตรวจ: `ss -ltn | grep 15432` ต้องเป็น `127.0.0.1:15432` ถ้าชื่อ service ฐานข้อมูลเปลี่ยน ดู Internal Host ใน `spk-r5-db` > General

DBeaver:

- Main: Host `127.0.0.1` (ไม่ใช้ `localhost` อาจแปลงเป็น IPv6), Port `15432`, Database/Username/Password ของ `spk-r5-db`
- SSH: Host IP ของ VPS, Port `22`, User `root`, Public Key ใส่ path เต็มของ private key (DBeaver ไม่แปลง `~`), Advanced settings > Implementation `SSHJ`, **ไม่ติ๊ก** Share this tunnel with other connections (tunnel ที่ค้างจากการตั้งค่าผิดจะถูกใช้ซ้ำแล้วได้ `Connection reset`)
- General: Connection type `Production`, ติ๊ก Read-only connection

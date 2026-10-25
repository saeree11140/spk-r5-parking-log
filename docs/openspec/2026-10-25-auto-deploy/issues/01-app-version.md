# 01: version ใน backend และ frontend

**What to build:** build arg `APP_VERSION` ใน Dockerfile ทั้งสอง backend ตอบ `version` ใน `/api/health` (ค่าเริ่มต้น `dev`) frontend เขียน `/version.txt` CI ส่ง `github.sha`

**Blocked by:** none

**Status:** done

- [x] unit/e2e ของ health ครอบ version
- [x] build image ในเครื่องด้วย build arg แล้วได้ version ตรง

## Comments

- 2026-10-25: `HealthController` อ่าน `APP_VERSION` (ว่างได้ `dev`) unit 2 กรณีและ e2e `GET /api/health` ผ่าน build image ในเครื่องด้วย `--build-arg APP_VERSION=abc123test` backend ได้ env ตรง frontend `/version.txt` ได้ค่าตรงพร้อม `Cache-Control: no-cache` ARG อยู่ท้าย Dockerfile เพื่อไม่ให้ cache ของ layer ก่อนหน้าหลุดทุก commit

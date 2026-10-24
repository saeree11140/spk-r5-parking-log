# 04: GitHub Actions สำหรับ check และ build image

**What to build:** workflow ที่รันทุก push และ pull request: lint, typecheck, unit test ของทุก package และ backend e2e ที่มี Postgres 18 เป็น service container ถ้า push `main` และผ่านทุกขั้น ให้ build image backend และ frontend แล้ว push ไป GHCR แบบ public tag `latest` และ commit SHA ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-24-dokploy-deploy/spec.md`

**Blocked by:** 02, 03

**Status:** ready-for-agent

- [ ] workflow รันผ่านบน GitHub จริง
- [ ] ขั้นไหนไม่ผ่าน image จะไม่ถูก push
- [ ] image อยู่ที่ `ghcr.io/saeree11140/spk-r5-parking-log-backend` และ `-frontend` และ pull ได้โดยไม่ต้อง login
- [ ] สถาปัตยกรรมตรงกับ VPS

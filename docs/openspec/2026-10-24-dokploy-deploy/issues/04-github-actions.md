# 04: GitHub Actions สำหรับ check และ build image

**What to build:** workflow ที่รันทุก push และ pull request: lint, typecheck, unit test ของทุก package และ backend e2e ที่มี Postgres 18 เป็น service container ถ้า push `main` และผ่านทุกขั้น ให้ build image backend และ frontend แล้ว push ไป GHCR แบบ public tag `latest` และ commit SHA ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-24-dokploy-deploy/spec.md`

**Blocked by:** 02, 03

**Status:** done

- [x] workflow รันผ่านบน GitHub จริง
- [x] ขั้นไหนไม่ผ่าน image จะไม่ถูก push
- [x] image อยู่ที่ `ghcr.io/saeree11140/spk-r5-parking-log-backend` และ `-frontend` และ pull ได้โดยไม่ต้อง login
- [x] สถาปัตยกรรมตรงกับ VPS

## Comments

- VPS เป็น `x86_64` image จึง build เฉพาะ `linux/amd64` บน runner ของ GitHub ซึ่งเป็น amd64 อยู่แล้ว
- job `check` รันทุก push และ PR: lint ทุก package, typecheck frontend, build backend/frontend, `pnpm test` และ backend e2e ที่มี `postgres:18.4-alpine3.23` เป็น service container ส่วน job `images` รันเฉพาะ push `main` หลัง `check` ผ่าน
- ไม่รัน `tsc --noEmit` ของ backend เพราะ spec เดิมมี type error ค้างอยู่ (`nest build` ตรวจ type ของ `src` ให้แล้ว)
- `actionlint` (Docker) ไม่เจอปัญหา ยังไม่ได้รันบน GitHub จริง
- package ใน GHCR ที่สร้างครั้งแรกอาจเป็น private ต้องเปลี่ยนเป็น public ครั้งเดียวที่หน้า package settings
- run #1 (`33a8500`) ผ่าน: `check` 1m47s, Vitest 163/163, `images` ถูกข้ามเพราะไม่ใช่ `main` มี warning ว่า action รุ่นเก่าเขียนไว้สำหรับ Node 20 และ notice ว่า `ubuntu-latest` จะย้ายไป Ubuntu 26 ตั้งแต่ 2026-10-19
- อัปเดต action เป็น major ล่าสุด (เช็กด้วย `git ls-remote`), pin `ubuntu-24.04` และให้ `images` build ทุก push แต่ push GHCR เฉพาะ `main` run #2 (`3c29b99`) ผ่านใน 4m32s
- ยังเหลือ: push ขึ้น GHCR จริงจาก `main` และเปลี่ยน package เป็น public
- push `main` (`09de0a2`) แล้ว image ขึ้น GHCR ทั้งสองตัว tag `latest` และ `sha-09de0a2...` เปลี่ยนเป็น public แล้ว ดึง manifest จาก GHCR ด้วย token แบบไม่ login ได้ เป็น `linux/amd64` + attestation manifest

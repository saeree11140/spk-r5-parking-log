# Login lockout ผูกกับ (user, IP) และมีเพดานรวมต่อ user

login เปิดสู่ internet สาธารณะ การล็อกทั้งบัญชีเมื่อผิด 5 ครั้งจึงเปิดให้ใครก็ได้ที่รู้ username ล็อก ADMIN ที่มีอยู่คนเดียวค้างไว้ เราจึงล็อกแยกต่อ (user, IP) เมื่อผิด 5 ครั้ง (15 นาที) และมีเพดานรวมต่อ user 20 ครั้งใน 1 ชั่วโมงจากทุก IP (ล็อกทั้งบัญชี 15 นาที) เพื่อกัน brute force จากหลาย IP ส่วนการปลดล็อกทำได้ทาง admin reset-password หรือ CLI `auth:unlock` ผลคือ lockout ต่อ IP พึ่ง `req.ip` ที่ถูกต้อง production จึงต้องตั้ง `TRUST_PROXY_HOPS` เอง

## Considered Options

- **ตัดจบบัญชีที่ล็อกก่อนรัน argon2:** ไม่ทำ ผู้โจมตีใช้ username มั่วก็ยังต้องรัน dummy hash อยู่ดี จึงประหยัดได้น้อย และเวลาตอบที่ต่างกันจะบอกว่า username นี้มีอยู่และถูกล็อก
- **cap จำนวน argon2 ที่รันพร้อมกัน:** ไม่ทำ `argon2` รันใน `Napi::AsyncWorker` บน libuv threadpool (`UV_THREADPOOL_SIZE`, default 4) memory จึงจำกัดที่ประมาณ 4×64 MiB อยู่แล้ว งานที่เกินเข้าคิว ถ้า cap แล้วตอบ 503 คนที่มีหลาย IP จะใช้ทำให้ทุกคน login ไม่ได้
- **login สำเร็จล้างเพดานรวม:** ไม่ทำ ทุกครั้งที่ ADMIN login ผู้โจมตีจะได้โควตาใหม่

-- Violation categories. Each cycle belongs to one house and one category.
CREATE TABLE "violation_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "normalized_name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "violation_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "violation_categories_normalized_name_key"
  ON "violation_categories"("normalized_name");

ALTER TABLE "violation_categories"
  ADD CONSTRAINT "violation_categories_name_not_blank"
  CHECK (char_length(btrim("name")) BETWEEN 1 AND 100);

INSERT INTO "violation_categories" ("id", "name", "normalized_name", "created_at", "updated_at")
VALUES
  ('5c0f3d0e-7b1a-4c55-9a51-2f3c1f0a0001', 'จอดรถผิดระเบียบ', 'จอดรถผิดระเบียบ',
    '2026-10-11 00:00:00+00', CURRENT_TIMESTAMP),
  ('5c0f3d0e-7b1a-4c55-9a51-2f3c1f0a0002', 'ปล่อยสัตว์เลี้ยงขับถ่ายในพื้นที่ส่วนกลางแล้วไม่เก็บ',
    'ปล่อยสัตว์เลี้ยงขับถ่ายในพื้นที่ส่วนกลางแล้วไม่เก็บ',
    '2026-10-11 00:00:01+00', CURRENT_TIMESTAMP);

-- Every existing cycle was a parking cycle.
ALTER TABLE "violation_cycles" ADD COLUMN "category_id" UUID;

UPDATE "violation_cycles"
SET "category_id" = '5c0f3d0e-7b1a-4c55-9a51-2f3c1f0a0001';

ALTER TABLE "violation_cycles" ALTER COLUMN "category_id" SET NOT NULL;

ALTER TABLE "violation_cycles"
  ADD CONSTRAINT "violation_cycles_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "violation_categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "violation_cycles_category_id_idx" ON "violation_cycles"("category_id");

DROP INDEX "violation_cycles_house_id_cycle_number_key";
CREATE UNIQUE INDEX "violation_cycles_house_id_category_id_cycle_number_key"
  ON "violation_cycles"("house_id", "category_id", "cycle_number");

DROP INDEX "violation_cycles_one_open_per_house";
CREATE UNIQUE INDEX "violation_cycles_one_open_per_house_category"
  ON "violation_cycles" ("house_id", "category_id")
  WHERE "status" = 'OPEN';

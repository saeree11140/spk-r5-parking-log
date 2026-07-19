-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "cycle_status" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "violation_status" AS ENUM ('WARNING', 'PENDING_FINE', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "fine_status" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('CREATE', 'UPDATE', 'CANCEL', 'PAY', 'RESEQUENCE');

-- CreateEnum
CREATE TYPE "audit_actor_type" AS ENUM ('SYSTEM', 'USER');

-- CreateTable
CREATE TABLE "houses" (
    "id" UUID NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "actual_house_number" VARCHAR(64),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violation_cycles" (
    "id" UUID NOT NULL,
    "house_id" UUID NOT NULL,
    "cycle_number" INTEGER NOT NULL,
    "status" "cycle_status" NOT NULL DEFAULT 'OPEN',
    "opened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "violation_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_violations" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "sequence_number" INTEGER,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "violation_status" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "parking_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fines" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "amount_baht" INTEGER NOT NULL,
    "status" "fine_status" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fine_payments" (
    "id" UUID NOT NULL,
    "fine_id" UUID NOT NULL,
    "amount_baht" INTEGER NOT NULL,
    "paid_at" TIMESTAMPTZ(3) NOT NULL,
    "reference" VARCHAR(128),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fine_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" UUID NOT NULL,
    "violation_id" UUID NOT NULL,
    "object_key" VARCHAR(512) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(128) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "audit_action" NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "actor_type" "audit_actor_type" NOT NULL DEFAULT 'SYSTEM',
    "actor_id" UUID,
    "actor_label" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "houses_code_key" ON "houses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "houses_sequence_number_key" ON "houses"("sequence_number");

-- CreateIndex
CREATE INDEX "violation_cycles_house_id_idx" ON "violation_cycles"("house_id");

-- CreateIndex
CREATE UNIQUE INDEX "violation_cycles_house_id_cycle_number_key" ON "violation_cycles"("house_id", "cycle_number");

-- CreateIndex
CREATE INDEX "parking_violations_cycle_id_idx" ON "parking_violations"("cycle_id");

-- CreateIndex
CREATE INDEX "parking_violations_occurred_at_idx" ON "parking_violations"("occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "parking_violations_cycle_id_sequence_number_key" ON "parking_violations"("cycle_id", "sequence_number");

-- CreateIndex
CREATE UNIQUE INDEX "fines_cycle_id_key" ON "fines"("cycle_id");

-- CreateIndex
CREATE UNIQUE INDEX "fine_payments_fine_id_key" ON "fine_payments"("fine_id");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_object_key_key" ON "evidence"("object_key");

-- CreateIndex
CREATE INDEX "evidence_violation_id_idx" ON "evidence"("violation_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- AddForeignKey
ALTER TABLE "violation_cycles" ADD CONSTRAINT "violation_cycles_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_violations" ADD CONSTRAINT "parking_violations_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "violation_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "violation_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_payments" ADD CONSTRAINT "fine_payments_fine_id_fkey" FOREIGN KEY ("fine_id") REFERENCES "fines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_violation_id_fkey" FOREIGN KEY ("violation_id") REFERENCES "parking_violations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "houses"
  ADD CONSTRAINT "houses_sequence_number_positive" CHECK ("sequence_number" >= 1);

ALTER TABLE "violation_cycles"
  ADD CONSTRAINT "violation_cycles_cycle_number_positive" CHECK ("cycle_number" >= 1),
  ADD CONSTRAINT "violation_cycles_closed_at_matches_status" CHECK (
    ("status" = 'OPEN' AND "closed_at" IS NULL)
    OR ("status" = 'CLOSED' AND "closed_at" IS NOT NULL)
  );

ALTER TABLE "parking_violations"
  ADD CONSTRAINT "parking_violations_sequence_matches_status" CHECK (
    ("status" = 'CANCELLED' AND "sequence_number" IS NULL)
    OR ("status" <> 'CANCELLED' AND "sequence_number" >= 1)
  );

ALTER TABLE "fines"
  ADD CONSTRAINT "fines_amount_baht_non_negative" CHECK ("amount_baht" >= 0);

ALTER TABLE "fine_payments"
  ADD CONSTRAINT "fine_payments_amount_baht_positive" CHECK ("amount_baht" > 0);

ALTER TABLE "evidence"
  ADD CONSTRAINT "evidence_size_bytes_non_negative" CHECK ("size_bytes" >= 0);

-- AddPartialIndex
CREATE UNIQUE INDEX "violation_cycles_one_open_per_house"
  ON "violation_cycles" ("house_id")
  WHERE "status" = 'OPEN';

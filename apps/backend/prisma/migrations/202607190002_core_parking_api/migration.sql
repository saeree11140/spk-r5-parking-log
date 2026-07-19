DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "fines") OR EXISTS (SELECT 1 FROM "fine_payments") THEN
    RAISE EXCEPTION 'core parking API migration requires empty fines and fine_payments tables';
  END IF;
END $$;

-- AlterEnum
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'CLOSE';

-- DropForeignKey
ALTER TABLE "fine_payments" DROP CONSTRAINT "fine_payments_fine_id_fkey";

-- DropForeignKey
ALTER TABLE "fines" DROP CONSTRAINT "fines_cycle_id_fkey";

-- DropIndex
DROP INDEX "fines_cycle_id_key";

-- AlterTable
ALTER TABLE "fines" DROP COLUMN "cycle_id",
ADD COLUMN     "paid_at" TIMESTAMPTZ(3),
ADD COLUMN     "reference" VARCHAR(128),
ADD COLUMN     "violation_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "parking_violations" ADD COLUMN     "cancellation_reason" VARCHAR(500),
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(3);

-- Replace domain constraints for per-violation fines and cancellation metadata
ALTER TABLE "parking_violations" DROP CONSTRAINT "parking_violations_sequence_matches_status";
ALTER TABLE "parking_violations" ADD CONSTRAINT "parking_violations_state_consistent" CHECK (
  ("status" = 'CANCELLED' AND "sequence_number" IS NULL AND "cancelled_at" IS NOT NULL
    AND char_length("cancellation_reason") BETWEEN 5 AND 500)
  OR ("status" <> 'CANCELLED' AND "sequence_number" >= 1
    AND "cancelled_at" IS NULL AND "cancellation_reason" IS NULL)
);

ALTER TABLE "fines" DROP CONSTRAINT "fines_amount_baht_non_negative";
ALTER TABLE "fines" ADD CONSTRAINT "fines_state_consistent" CHECK (
  ("status" = 'PENDING' AND "amount_baht" IN (500, 1000) AND "paid_at" IS NULL AND "reference" IS NULL)
  OR ("status" = 'PAID' AND "amount_baht" IN (500, 1000) AND "paid_at" IS NOT NULL)
  OR ("status" = 'CANCELLED' AND "amount_baht" = 0 AND "paid_at" IS NULL AND "reference" IS NULL)
);

-- DropTable
DROP TABLE "fine_payments";

-- CreateIndex
CREATE UNIQUE INDEX "fines_violation_id_key" ON "fines"("violation_id");

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_violation_id_fkey" FOREIGN KEY ("violation_id") REFERENCES "parking_violations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

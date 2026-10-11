-- Existing cycles keep the original fine schedule until they close.
CREATE TYPE "fine_rule_version" AS ENUM ('V1', 'V2');

ALTER TABLE "violation_cycles"
  ADD COLUMN "fine_rule_version" "fine_rule_version" NOT NULL DEFAULT 'V1';

-- An open cycle without active violations has nothing to grandfather, so it
-- starts on the current schedule instead of staying on V1 indefinitely.
UPDATE "violation_cycles" AS cycle
SET "fine_rule_version" = 'V2'
WHERE cycle."status" = 'OPEN'
  AND NOT EXISTS (
    SELECT 1
    FROM "parking_violations" AS violation
    WHERE violation."cycle_id" = cycle."id"
      AND violation."status" <> 'CANCELLED'
  );

ALTER TABLE "violation_cycles"
  ALTER COLUMN "fine_rule_version" SET DEFAULT 'V2';

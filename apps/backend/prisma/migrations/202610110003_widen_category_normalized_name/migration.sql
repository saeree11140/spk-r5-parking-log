-- Normalizing a 100-character name (NFKC + lowercase) can produce a longer key.
ALTER TABLE "violation_categories"
  ALTER COLUMN "normalized_name" TYPE VARCHAR(400);

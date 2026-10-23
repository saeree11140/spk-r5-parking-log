-- Lockout moves from one counter per user to one counter per user and IP.
UPDATE "users" SET "failed_login_attempts" = 0, "locked_until" = NULL;

-- CreateTable
CREATE TABLE "login_failures" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ip_address" VARCHAR(64) NOT NULL,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "login_failures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "login_failures_user_id_ip_address_key" ON "login_failures"("user_id", "ip_address");

-- CreateIndex
CREATE INDEX "login_failures_updated_at_idx" ON "login_failures"("updated_at");

-- AddForeignKey
ALTER TABLE "login_failures" ADD CONSTRAINT "login_failures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

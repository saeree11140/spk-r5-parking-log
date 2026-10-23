-- users.failed_login_attempts now counts failures from every IP within a one-hour window.
ALTER TABLE "users" ADD COLUMN "failed_window_started_at" TIMESTAMPTZ(3);

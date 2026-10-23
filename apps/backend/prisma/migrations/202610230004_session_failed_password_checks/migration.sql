-- Wrong current passwords on change-password, counted per session.
ALTER TABLE "auth_sessions" ADD COLUMN "failed_password_checks" INTEGER NOT NULL DEFAULT 0;

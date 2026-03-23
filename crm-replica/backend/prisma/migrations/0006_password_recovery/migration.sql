ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "password_reset_token" TEXT,
  ADD COLUMN IF NOT EXISTS "password_reset_expires" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_password_reset_token_idx" ON "User"("password_reset_token");
CREATE INDEX IF NOT EXISTS "User_password_reset_expires_idx" ON "User"("password_reset_expires");

ALTER TABLE "administrators"
ADD COLUMN "login" VARCHAR(100),
ADD COLUMN "password_hash" TEXT;

UPDATE "administrators" AS admin
SET
  "login" = LOWER(users.email),
  "password_hash" = users.password_hash
FROM "users"
WHERE users.id = admin.user_id;

ALTER TABLE "administrators"
ALTER COLUMN "login" SET NOT NULL,
ALTER COLUMN "password_hash" SET NOT NULL;

CREATE UNIQUE INDEX "administrators_login_key" ON "administrators"("login");

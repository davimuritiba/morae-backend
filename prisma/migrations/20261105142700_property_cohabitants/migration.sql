-- CreateTable
CREATE TABLE "property_cohabitants" (
    "property_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_cohabitants_pkey" PRIMARY KEY ("property_id","user_id")
);

-- Preserve existing property owners as the initial cohabitant when possible.
INSERT INTO "property_cohabitants" ("property_id", "user_id")
SELECT "properties"."id", "property_owners"."user_id"
FROM "properties"
JOIN "property_owners" ON "property_owners"."id" = "properties"."owner_id";

-- CreateIndex
CREATE INDEX "property_cohabitants_user_id_idx" ON "property_cohabitants"("user_id");

-- AddForeignKey
ALTER TABLE "property_cohabitants"
ADD CONSTRAINT "property_cohabitants_property_id_fkey"
FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_cohabitants"
ADD CONSTRAINT "property_cohabitants_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove the previous one-owner relationship.
ALTER TABLE "properties" DROP CONSTRAINT "properties_owner_id_fkey";
DROP INDEX "properties_owner_id_idx";
ALTER TABLE "properties" DROP COLUMN "owner_id";

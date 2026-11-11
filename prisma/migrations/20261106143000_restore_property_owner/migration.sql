-- Restore the required owner relationship removed by the cohabitants migration.
ALTER TABLE "properties" ADD COLUMN "owner_id" UUID;

-- Before the relationship was removed, each property's owner was also inserted
-- as a cohabitant. Use that legacy link to backfill existing properties.
UPDATE "properties" AS p
SET "owner_id" = po."id"
FROM "property_cohabitants" AS pc
JOIN "property_owners" AS po ON po."user_id" = pc."user_id"
WHERE pc."property_id" = p."id";

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "properties" WHERE "owner_id" IS NULL) THEN
        RAISE EXCEPTION 'Não foi possível identificar o proprietário de todos os imóveis existentes';
    END IF;
END $$;

ALTER TABLE "properties" ALTER COLUMN "owner_id" SET NOT NULL;
CREATE INDEX "properties_owner_id_idx" ON "properties"("owner_id");
ALTER TABLE "properties"
ADD CONSTRAINT "properties_owner_id_fkey"
FOREIGN KEY ("owner_id") REFERENCES "property_owners"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

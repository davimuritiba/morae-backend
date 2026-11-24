CREATE TYPE "ReportCategory" AS ENUM (
    'FRAUD',
    'HARASSMENT',
    'INAPPROPRIATE_CONTENT',
    'SAFETY',
    'OTHER'
);

CREATE TYPE "ReportStatus" AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'RESOLVED',
    'DISMISSED'
);

CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "listing_id" UUID,
    "category" "ReportCategory" NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "admin_note" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reports_description_check" CHECK (char_length(btrim("description")) >= 20)
);

CREATE INDEX "reports_status_created_at_idx"
ON "reports"("status", "created_at" DESC);
CREATE INDEX "reports_reporter_id_created_at_idx"
ON "reports"("reporter_id", "created_at" DESC);
CREATE INDEX "reports_target_user_id_created_at_idx"
ON "reports"("target_user_id", "created_at" DESC);
CREATE INDEX "reports_listing_id_idx" ON "reports"("listing_id");

ALTER TABLE "reports"
ADD CONSTRAINT "reports_reporter_id_fkey"
FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reports"
ADD CONSTRAINT "reports_target_user_id_fkey"
FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reports"
ADD CONSTRAINT "reports_listing_id_fkey"
FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

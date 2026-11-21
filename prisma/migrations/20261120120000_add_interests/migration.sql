CREATE TABLE "interests" (
    "user_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interests_pkey" PRIMARY KEY ("user_id", "listing_id")
);

CREATE INDEX "interests_listing_id_created_at_idx"
ON "interests"("listing_id", "created_at" DESC);

ALTER TABLE "interests"
ADD CONSTRAINT "interests_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interests"
ADD CONSTRAINT "interests_listing_id_fkey"
FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

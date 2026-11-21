CREATE TABLE "favorites" (
    "user_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id", "listing_id")
);

CREATE INDEX "favorites_listing_id_idx" ON "favorites"("listing_id");

ALTER TABLE "favorites"
ADD CONSTRAINT "favorites_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorites"
ADD CONSTRAINT "favorites_listing_id_fkey"
FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

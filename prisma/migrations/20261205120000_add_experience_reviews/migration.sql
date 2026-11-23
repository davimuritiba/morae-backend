CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "reviewed_user_id" UUID NOT NULL,
    "cleanliness" SMALLINT NOT NULL,
    "condition" SMALLINT NOT NULL,
    "location" SMALLINT NOT NULL,
    "communication" SMALLINT NOT NULL,
    "value" SMALLINT NOT NULL,
    "overall" SMALLINT NOT NULL,
    "comment" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reviews_contract_id_key" UNIQUE ("contract_id"),
    CONSTRAINT "reviews_cleanliness_check" CHECK ("cleanliness" BETWEEN 1 AND 5),
    CONSTRAINT "reviews_condition_check" CHECK ("condition" BETWEEN 1 AND 5),
    CONSTRAINT "reviews_location_check" CHECK ("location" BETWEEN 1 AND 5),
    CONSTRAINT "reviews_communication_check" CHECK ("communication" BETWEEN 1 AND 5),
    CONSTRAINT "reviews_value_check" CHECK ("value" BETWEEN 1 AND 5),
    CONSTRAINT "reviews_overall_check" CHECK ("overall" BETWEEN 1 AND 5),
    CONSTRAINT "reviews_comment_check" CHECK (char_length(btrim("comment")) >= 20)
);

CREATE INDEX "reviews_reviewed_user_id_created_at_idx"
ON "reviews"("reviewed_user_id", "created_at" DESC);

CREATE INDEX "reviews_reviewer_id_idx" ON "reviews"("reviewer_id");

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_contract_id_fkey"
FOREIGN KEY ("contract_id") REFERENCES "rental_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_reviewer_id_fkey"
FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_reviewed_user_id_fkey"
FOREIGN KEY ("reviewed_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

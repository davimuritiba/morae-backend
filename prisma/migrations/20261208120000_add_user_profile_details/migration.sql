CREATE TABLE "user_profile_details" (
    "user_id" UUID NOT NULL,
    "bio" VARCHAR(1000),
    "birth_date" DATE,
    "gender" VARCHAR(20),
    "country" VARCHAR(60),
    "state" VARCHAR(60),
    "city" VARCHAR(100),
    "neighborhood" VARCHAR(100),
    "postal_code" CHAR(8),
    "address" VARCHAR(200),
    "university" VARCHAR(150),
    "campus" VARCHAR(100),
    "housing_type" VARCHAR(20),
    "max_budget" DECIMAL(10,2),
    "campus_distance" VARCHAR(20),
    "preferred_neighborhoods" VARCHAR(300),
    "desired_roommates" VARCHAR(20),
    "roommate_gender" VARCHAR(20),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_profile_details_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "user_profile_details"
ADD CONSTRAINT "user_profile_details_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

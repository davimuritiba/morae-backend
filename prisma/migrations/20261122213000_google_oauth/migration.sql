CREATE TABLE "external_auth_states" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "state_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_auth_states_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "google_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_auth_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_auth_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_auth_states_state_hash_key" ON "external_auth_states"("state_hash");
CREATE INDEX "external_auth_states_provider_expires_at_idx" ON "external_auth_states"("provider", "expires_at");
CREATE UNIQUE INDEX "external_auth_codes_code_hash_key" ON "external_auth_codes"("code_hash");
CREATE INDEX "external_auth_codes_provider_expires_at_idx" ON "external_auth_codes"("provider", "expires_at");
CREATE UNIQUE INDEX "google_identities_user_id_key" ON "google_identities"("user_id");
CREATE UNIQUE INDEX "google_identities_subject_key" ON "google_identities"("subject");

ALTER TABLE "external_auth_codes"
ADD CONSTRAINT "external_auth_codes_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "google_identities"
ADD CONSTRAINT "google_identities_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

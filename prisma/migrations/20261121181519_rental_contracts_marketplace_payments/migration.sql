-- CreateEnum
CREATE TYPE "RentalContractStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'TERMINATED');

-- AlterEnum
ALTER TYPE "PaymentTransactionStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "checkout_url" VARCHAR(2048),
ADD COLUMN     "listing_id" UUID,
ADD COLUMN     "platform_fee" DECIMAL(10,2),
ADD COLUMN     "property_id" UUID,
ADD COLUMN     "provider" VARCHAR(40),
ADD COLUMN     "provider_payment_id" VARCHAR(100),
ADD COLUMN     "provider_preference_id" VARCHAR(100),
ADD COLUMN     "provider_status" VARCHAR(40),
ADD COLUMN     "rent_amount" DECIMAL(10,2),
ADD COLUMN     "rental_contract_id" UUID,
ADD COLUMN     "rental_period" DATE;

-- CreateTable
CREATE TABLE "rental_contracts" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "monthly_rent" DECIMAL(10,2) NOT NULL,
    "starts_at" DATE NOT NULL,
    "ends_at" DATE,
    "due_day" SMALLINT NOT NULL,
    "status" "RentalContractStatus" NOT NULL DEFAULT 'PENDING',
    "owner_accepted_at" TIMESTAMPTZ(3) NOT NULL,
    "tenant_accepted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rental_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_provider_connections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider_user_id" VARCHAR(100) NOT NULL,
    "access_token_encrypted" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_provider_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_oauth_states" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "state_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rental_contracts_owner_id_status_idx" ON "rental_contracts"("owner_id", "status");

-- CreateIndex
CREATE INDEX "rental_contracts_tenant_id_status_idx" ON "rental_contracts"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_connections_user_id_key" ON "payment_provider_connections"("user_id");

-- CreateIndex
CREATE INDEX "payment_provider_connections_provider_user_id_idx" ON "payment_provider_connections"("provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_oauth_states_state_hash_key" ON "payment_oauth_states"("state_hash");

-- CreateIndex
CREATE INDEX "payment_oauth_states_user_id_expires_at_idx" ON "payment_oauth_states"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "payment_transactions_payer_id_property_id_rental_period_idx" ON "payment_transactions"("payer_id", "property_id", "rental_period");

-- CreateIndex
CREATE INDEX "payment_transactions_rental_contract_id_rental_period_idx" ON "payment_transactions"("rental_contract_id", "rental_period");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_provider_provider_payment_id_key" ON "payment_transactions"("provider", "provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_provider_provider_preference_id_key" ON "payment_transactions"("provider", "provider_preference_id");

-- AddCheckConstraint
ALTER TABLE "rental_contracts"
    ADD CONSTRAINT "rental_contracts_parties_check" CHECK ("owner_id" <> "tenant_id"),
    ADD CONSTRAINT "rental_contracts_rent_check" CHECK ("monthly_rent" > 0),
    ADD CONSTRAINT "rental_contracts_due_day_check" CHECK ("due_day" BETWEEN 1 AND 28),
    ADD CONSTRAINT "rental_contracts_dates_check" CHECK ("ends_at" IS NULL OR "ends_at" > "starts_at");

-- AddCheckConstraint
ALTER TABLE "payment_transactions"
    ADD CONSTRAINT "payment_transactions_rent_amount_check" CHECK ("rent_amount" IS NULL OR "rent_amount" > 0),
    ADD CONSTRAINT "payment_transactions_platform_fee_check" CHECK ("platform_fee" IS NULL OR "platform_fee" >= 0);

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_rental_contract_id_fkey" FOREIGN KEY ("rental_contract_id") REFERENCES "rental_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- AddForeignKey
ALTER TABLE "payment_provider_connections" ADD CONSTRAINT "payment_provider_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_oauth_states" ADD CONSTRAINT "payment_oauth_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

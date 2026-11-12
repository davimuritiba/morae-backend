-- CreateEnum
CREATE TYPE "HousingType" AS ENUM ('APARTMENT', 'HOUSE', 'ROOM', 'REPUBLIC');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('PHOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('MONTHLY_RENTAL', 'PROPERTY_SHARING', 'SEASONAL');

-- CreateEnum
CREATE TYPE "MinimumStay" AS ENUM ('NO_MINIMUM', 'THREE_MONTHS', 'SIX_MONTHS', 'TWELVE_MONTHS');

-- CreateTable
CREATE TABLE "residences" (
    "id" UUID NOT NULL,
    "postal_code" CHAR(8) NOT NULL,
    "state" CHAR(2) NOT NULL,
    "street" VARCHAR(150) NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "complement" VARCHAR(100),
    "city" VARCHAR(100) NOT NULL,
    "neighborhood" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "residences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "residence_id" UUID NOT NULL,
    "housing_type" "HousingType" NOT NULL,
    "bedrooms" SMALLINT NOT NULL,
    "bathrooms" SMALLINT NOT NULL,
    "parking_spaces" SMALLINT NOT NULL DEFAULT 0,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "title" VARCHAR(90) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "rules" VARCHAR(500),
    "rent" DECIMAL(10,2) NOT NULL,
    "condominium" DECIMAL(10,2),
    "contract_type" "ContractType" NOT NULL,
    "minimum_stay" "MinimumStay" NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_media" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "position" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "properties_residence_id_key" ON "properties"("residence_id");
CREATE INDEX "properties_owner_id_idx" ON "properties"("owner_id");
CREATE INDEX "listings_property_id_idx" ON "listings"("property_id");
CREATE INDEX "listings_status_idx" ON "listings"("status");
CREATE UNIQUE INDEX "listing_media_listing_id_position_key" ON "listing_media"("listing_id", "position");
CREATE INDEX "listing_media_listing_id_idx" ON "listing_media"("listing_id");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "property_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "properties" ADD CONSTRAINT "properties_residence_id_fkey" FOREIGN KEY ("residence_id") REFERENCES "residences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "listings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

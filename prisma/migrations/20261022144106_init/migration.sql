-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('VERIFY_DOCUMENTS', 'MODERATE_LISTINGS', 'MANAGE_USERS', 'VIEW_REPORTS');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "cpf" CHAR(11) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" VARCHAR(11),
    "photo_url" VARCHAR(2048),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "enrollment_number" VARCHAR(15) NOT NULL,
    "course" VARCHAR(100) NOT NULL,
    "period" SMALLINT NOT NULL,
    "expected_graduation" DATE NOT NULL,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "bio" VARCHAR(500) NOT NULL,
    "income" DECIMAL(10,2),
    "min_budget" DECIMAL(10,2) NOT NULL,
    "max_budget" DECIMAL(10,2) NOT NULL,
    "is_smoker" BOOLEAN NOT NULL,
    "noise_preference" SMALLINT NOT NULL,
    "visit_preference" SMALLINT NOT NULL,
    "schedule" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_owners" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "property_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "administrators" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "permissions" "Permission"[] DEFAULT ARRAY[]::"Permission"[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "administrators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_enrollment_number_key" ON "students"("enrollment_number");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_student_id_key" ON "student_profiles"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "property_owners_user_id_key" ON "property_owners"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "administrators_user_id_key" ON "administrators"("user_id");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administrators" ADD CONSTRAINT "administrators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

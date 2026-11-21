CREATE TYPE "SleepTime" AS ENUM ('BEFORE_21', 'FROM_21_TO_23', 'FROM_23_TO_01', 'AFTER_01');
CREATE TYPE "StudyAtHome" AS ENUM ('YES', 'SOMETIMES', 'NO');
CREATE TYPE "OrganizationLevel" AS ENUM ('VERY_ORGANIZED', 'SOMEWHAT', 'IMPROVING');
CREATE TYPE "VisitorFrequency" AS ENUM ('RARELY', 'SOMETIMES', 'FREQUENTLY');
CREATE TYPE "SmokingFrequency" AS ENUM ('YES', 'SOMETIMES', 'NO');
CREATE TYPE "PetPreference" AS ENUM ('YES', 'NO');
CREATE TYPE "CleaningFrequency" AS ENUM ('DAILY', 'WEEKLY', 'FLEXIBLE');
CREATE TYPE "EnvironmentPreference" AS ENUM ('QUIET', 'BUSY', 'INDIFFERENT');
CREATE TYPE "LifestyleTrait" AS ENUM ('CALM', 'SOCIAL', 'ADVENTUROUS', 'STUDIOUS');

CREATE TABLE "student_compatibility_answers" (
    "student_id" UUID NOT NULL,
    "sleep_time" "SleepTime" NOT NULL,
    "study_at_home" "StudyAtHome" NOT NULL,
    "organization" "OrganizationLevel" NOT NULL,
    "visitors" "VisitorFrequency" NOT NULL,
    "smoking" "SmokingFrequency" NOT NULL,
    "pets" "PetPreference" NOT NULL,
    "cleaning" "CleaningFrequency" NOT NULL,
    "environment" "EnvironmentPreference" NOT NULL,
    "lifestyle" "LifestyleTrait"[] NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "student_compatibility_answers_pkey" PRIMARY KEY ("student_id")
);

ALTER TABLE "student_compatibility_answers"
ADD CONSTRAINT "student_compatibility_answers_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

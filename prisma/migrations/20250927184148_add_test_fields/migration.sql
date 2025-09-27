-- AlterTable
ALTER TABLE "public"."test_tables" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "score" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."test_tables" ADD COLUMN     "hash" TEXT,
ADD COLUMN     "readonly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "schemaHash" TEXT;

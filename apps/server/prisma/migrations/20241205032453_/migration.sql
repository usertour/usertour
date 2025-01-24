/*
  Warnings:

  - You are about to drop the column `data` on the `VersionOnLocalization` table. All the data in the column will be lost.
  - Added the required column `backup` to the `VersionOnLocalization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `localized` to the `VersionOnLocalization` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VersionOnLocalization" DROP COLUMN "data",
ADD COLUMN     "backup" JSONB NOT NULL,
ADD COLUMN     "localized" JSONB NOT NULL;

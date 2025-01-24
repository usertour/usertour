/*
  Warnings:

  - You are about to drop the column `deleteded` on the `Content` table. All the data in the column will be lost.
  - You are about to drop the column `deleteded` on the `Environment` table. All the data in the column will be lost.
  - You are about to drop the column `deleteded` on the `Theme` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Content" DROP COLUMN "deleteded",
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Environment" DROP COLUMN "deleteded",
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Theme" DROP COLUMN "deleteded",
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

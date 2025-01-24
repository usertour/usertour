/*
  Warnings:

  - You are about to drop the column `attributeId` on the `Events` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[codeName,projectId]` on the table `Events` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Events" DROP CONSTRAINT "Events_attributeId_fkey";

-- DropIndex
DROP INDEX "Events_codeName_attributeId_key";

-- AlterTable
ALTER TABLE "Events" DROP COLUMN "attributeId";

-- CreateTable
CREATE TABLE "EventsOnAttribute" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,

    CONSTRAINT "EventsOnAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventsOnAttribute_eventId_attributeId_key" ON "EventsOnAttribute"("eventId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "Events_codeName_projectId_key" ON "Events"("codeName", "projectId");

-- AddForeignKey
ALTER TABLE "EventsOnAttribute" ADD CONSTRAINT "EventsOnAttribute_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventsOnAttribute" ADD CONSTRAINT "EventsOnAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

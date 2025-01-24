-- CreateTable
CREATE TABLE "Attribute" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bizType" INTEGER NOT NULL DEFAULT 1,
    "projectId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT '',
    "codeName" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "dataType" INTEGER NOT NULL DEFAULT 1,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeValue" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "environmentId" TEXT NOT NULL,
    "bizId" TEXT NOT NULL DEFAULT '',
    "bizType" INTEGER NOT NULL DEFAULT 1,
    "value" JSONB NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_projectId_bizType_codeName_key" ON "Attribute"("projectId", "bizType", "codeName");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeValue_environmentId_bizId_bizType_key" ON "AttributeValue"("environmentId", "bizId", "bizType");

-- AddForeignKey
ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeValue" ADD CONSTRAINT "AttributeValue_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Localization" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Localization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionOnLocalization" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "versionId" TEXT NOT NULL,
    "localizationId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "VersionOnLocalization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Localization_projectId_code_key" ON "Localization"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "VersionOnLocalization_versionId_localizationId_key" ON "VersionOnLocalization"("versionId", "localizationId");

-- AddForeignKey
ALTER TABLE "Localization" ADD CONSTRAINT "Localization_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionOnLocalization" ADD CONSTRAINT "VersionOnLocalization_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionOnLocalization" ADD CONSTRAINT "VersionOnLocalization_localizationId_fkey" FOREIGN KEY ("localizationId") REFERENCES "Localization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

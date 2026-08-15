-- Add nullable columns first so the backfill can run before constraints.
ALTER TABLE "applications" ADD COLUMN "serialNumber" INTEGER;
ALTER TABLE "applications" ADD COLUMN "userId" TEXT;

-- Backfill userId from the owning vacancy (no-op on an empty table).
UPDATE "applications" a SET "userId" = v."userId"
FROM "vacancies" v
WHERE a."vacancyId" = v."id";

-- Backfill serialNumber per user in save order (no-op on an empty table).
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "userId"
    ORDER BY "dateSaved" ASC, "id" ASC
  ) AS rn
  FROM "applications"
)
UPDATE "applications" a SET "serialNumber" = ordered.rn
FROM ordered
WHERE a."id" = ordered."id";

-- Tighten to the final shape only after the backfill.
ALTER TABLE "applications" ALTER COLUMN "serialNumber" SET NOT NULL;
ALTER TABLE "applications" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "applications_userId_serialNumber_idx" ON "applications"("userId", "serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "applications_userId_serialNumber_key" ON "applications"("userId", "serialNumber");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

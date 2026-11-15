CREATE TABLE "CvUpload" (
  "id" UUID NOT NULL PRIMARY KEY,
  "ownerId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "size" INTEGER NOT NULL CHECK ("size" BETWEEN 1 AND 10485760),
  "status" TEXT NOT NULL DEFAULT 'pending'
    CHECK ("status" IN ('pending', 'validating', 'ready', 'attached', 'rejected', 'cancelled')),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "leaseUntil" TIMESTAMP(3),
  "attemptId" UUID,
  "cvId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CvUpload_cvId_key" ON "CvUpload"("cvId");
CREATE INDEX "CvUpload_ownerId_status_idx" ON "CvUpload"("ownerId", "status");
CREATE INDEX "CvUpload_createdAt_idx" ON "CvUpload"("createdAt");

CREATE TABLE "WalletPass" (
  "studentId" UUID NOT NULL,
  "classId" TEXT NOT NULL,
  "objectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletPass_pkey" PRIMARY KEY ("studentId"),
  CONSTRAINT "WalletPass_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WalletPass_objectId_key" ON "WalletPass"("objectId");

CREATE TABLE "OidcRestartDestination" (
    "token" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OidcRestartDestination_pkey" PRIMARY KEY ("token")
);
CREATE INDEX "OidcRestartDestination_expiresAt_idx" ON "OidcRestartDestination"("expiresAt");

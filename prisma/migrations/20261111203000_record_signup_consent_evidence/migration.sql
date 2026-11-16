ALTER TABLE "Student"
  ADD COLUMN "privacyPolicyVersion" TEXT,
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "consentAcceptedAt" TIMESTAMPTZ(6);

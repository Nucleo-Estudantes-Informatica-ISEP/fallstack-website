-- At most one booth Action per company (see actionRepository.ts's
-- findActionByCompanyId, which now uses findUnique instead of findFirst).
-- CreateIndex
CREATE UNIQUE INDEX "Action_companyId_key" ON "Action"("companyId");

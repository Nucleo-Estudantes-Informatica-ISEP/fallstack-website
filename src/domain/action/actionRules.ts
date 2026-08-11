// Idempotent on the actionId+studentId compound unique key, so concurrent
// completions of the same action race safely at the DB level via upsert
// instead of a findFirst-then-create check that can double-insert.
export const actionCompletionUpsertArgs = (
  studentId: string,
  actionId: string
) => ({
  where: { actionId_studentId: { studentId, actionId } },
  update: {},
  create: { studentId, actionId },
});

export function isActionQrTimestampFresh(
  timestamp: number,
  now: number,
  refreshRateMs: number
) {
  return timestamp <= now && now - timestamp <= refreshRateMs * 2;
}

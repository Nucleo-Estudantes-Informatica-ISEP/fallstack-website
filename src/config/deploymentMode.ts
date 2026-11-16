export function deploymentMode(value: string | undefined) {
  if (value === "OFF-SEASON" || value === "PREPARATION" || value === "EVENT")
    return value;
  throw new Error("DEPLOYMENT_MODE must be OFF-SEASON, PREPARATION or EVENT");
}

export function futureEditionStart(value: string | undefined, now: number) {
  // Require an explicit timezone; never interpret deployment dates in host time.
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  )
    return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate()
  )
    return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > now ? timestamp : null;
}

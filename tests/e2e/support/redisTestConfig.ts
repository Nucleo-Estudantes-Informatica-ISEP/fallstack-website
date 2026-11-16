export function getRedisTestUrl(
  env: Record<string, string | undefined> = process.env
) {
  const url = env.TEST_REDIS_URL?.trim();
  if (!url) {
    if ((env.CI && env.CI !== "false") || env.GITHUB_ACTIONS === "true")
      throw new Error(
        "TEST_REDIS_URL is required for distributed limiter tests in CI"
      );
    return undefined;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      "TEST_REDIS_URL must be a valid disposable loopback Redis URL"
    );
  }
  if (
    !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
    !["redis:", "rediss:"].includes(parsed.protocol)
  )
    throw new Error("TEST_REDIS_URL must target loopback disposable Redis");
  return url;
}

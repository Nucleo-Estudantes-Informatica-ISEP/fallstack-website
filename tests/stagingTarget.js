/** Shared by Node/Playwright orchestration and k6 (no Node-only APIs). */
export function assertStagingTarget(baseUrl, approvedUrl, confirmation) {
  if (confirmation !== "yes")
    throw new Error("Set CONFIRM_NON_PRODUCTION=yes; never test production.");
  const target = (baseUrl || "").replace(/\/$/, "");
  const approved = (approvedUrl || "").replace(/\/$/, "");
  if (!target || !approved || target !== approved)
    throw new Error("E2E_BASE_URL must match the approved STAGING_BASE_URL.");

  // Require an origin, plus an explicit staging hostname or loopback for local checks.
  const match = /^(https?):\/\/([a-z0-9.-]+)(?::([0-9]+))?$/.exec(target);
  if (!match)
    throw new Error(
      "Staging target must be an origin without credentials or paths."
    );
  const [, protocol, hostname] = match;
  const loopback = hostname === "localhost" || hostname === "127.0.0.1";
  if (
    !loopback &&
    (protocol !== "https" ||
      !/(^|[.-])(staging|stage|stg)([.-]|$)/.test(hostname))
  )
    throw new Error("Refusing production: use HTTPS with a staging hostname.");
  return target;
}

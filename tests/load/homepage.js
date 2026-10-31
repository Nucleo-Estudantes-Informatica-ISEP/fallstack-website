// Prefix match alone lets "/assets/../api/..." escape the allowlist, so reject
// dot segments and encoded dots/separators in the path (queries may encode URLs).
function isPlainPath(path) {
  return !/(?:^|\/)\.{1,2}(?:\/|$)/.test(path) && !/%(?:2e|2f|5c)/i.test(path);
}

// Only request assets served by the approved origin. Never follow HTML to an
// external host (including protocol-relative URLs) during a staging load run.
export function homepageAssets(references) {
  return [
    ...new Set(
      references.filter(
        (value) =>
          typeof value === "string" &&
          /^\/(?:_next\/|assets\/|api\/media\/)/.test(value) &&
          !value.includes("\\") &&
          !value.includes("#") &&
          isPlainPath(value.split("?")[0])
      )
    ),
  ];
}

export function visitorCookie(vu, cookies) {
  if (cookies.length === 0 || vu % 2 !== 0) return undefined;
  return cookies[(vu / 2 - 1) % cookies.length];
}

export function hasSessionRole(response) {
  try {
    return Boolean(response.json("role") || response.json("adminRole"));
  } catch {
    return false;
  }
}

export function hasPublicDataList(response) {
  try {
    return Array.isArray(response.json());
  } catch {
    return false;
  }
}

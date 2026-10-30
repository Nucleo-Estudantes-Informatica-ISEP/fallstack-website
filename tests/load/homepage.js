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
          !value.includes("#")
      )
    ),
  ];
}

export function visitorCookie(vu, cookies) {
  return vu % 2 === 0 ? cookies[(vu / 2 - 1) % cookies.length] : undefined;
}

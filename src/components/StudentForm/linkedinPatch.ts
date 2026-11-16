/**
 * LinkedIn value to send in an admin edit. An unchanged value is omitted so
 * that a legacy value stored before the strict format rule does not block
 * edits to other fields. Only a changed value is validated by the server.
 */
export function linkedinPatch(
  submitted: unknown,
  stored: string | null | undefined
): { linkedin?: string | null } {
  const next = typeof submitted === "string" ? submitted.trim() : "";
  if (next === (stored ?? "").trim()) return {};
  return { linkedin: next || null };
}

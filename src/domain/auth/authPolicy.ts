/**
 * "none"       - no session lookup; handler always receives null
 * "public"     - optional session (lookup still runs)
 * "session"    - any logged-in user
 * "student"    - logged-in user with a Student profile
 * "employee"   - logged-in user with an Employee profile and a Company
 * "staff"     - an NEI member or an admin
 * "admin"      - logged-in user with session.adminRole set (ADMIN or SUPER_ADMIN)
 * "superadmin" - logged-in user with session.adminRole === "SUPER_ADMIN"
 */
export type AuthPolicy =
  | "none"
  | "public"
  | "session"
  | "student"
  | "employee"
  | "staff"
  | "admin"
  | "superadmin";

export interface AuthPolicySession {
  // Null for an admin-only account - it isn't a STUDENT or EMPLOYEE.
  role: "STUDENT" | "EMPLOYEE" | null;
  // Null means not an admin at all. Orthogonal to role, not a narrowing of it.
  adminRole: "ADMIN" | "SUPER_ADMIN" | null;
  neiMember?: boolean;
  attendanceExpiresAt?: number;
  student: unknown;
  employee: { company: unknown } | null;
}

export function resolveAdminRole(
  hasGlobalAdminGrant: boolean,
  configuredRole: "ADMIN" | "SUPER_ADMIN" | null
) {
  return hasGlobalAdminGrant ? (configuredRole ?? "SUPER_ADMIN") : null;
}

export function resolveStoredAdminRole(
  hasGlobalAdminGrant: boolean,
  configuredRole: "ADMIN" | "SUPER_ADMIN" | null
) {
  if (!hasGlobalAdminGrant) return undefined;
  return configuredRole ?? "SUPER_ADMIN";
}

// Scanner page access is role-only; the twelve-hour attendance bound is
// enforced by the check-in and count endpoints ("staff" policy).
export function canAccessAttendanceScanner(
  session: Pick<AuthPolicySession, "adminRole" | "neiMember"> | null
): boolean {
  return Boolean(session?.adminRole) || session?.neiMember === true;
}

export function passesAuthPolicy(
  policy: AuthPolicy,
  session: AuthPolicySession | null
): boolean {
  if (policy === "none" || policy === "public") return true;
  if (!session) return false;
  if (policy === "session") return true;
  if (policy === "student")
    return session.role === "STUDENT" && !!session.student;
  if (policy === "employee")
    return session.role === "EMPLOYEE" && !!session.employee?.company;
  if (policy === "staff")
    return (
      (Boolean(session.adminRole) || session.neiMember === true) &&
      (session.attendanceExpiresAt ?? 0) > Date.now()
    );
  if (policy === "admin") return Boolean(session.adminRole);
  if (policy === "superadmin") return session.adminRole === "SUPER_ADMIN";
  return false;
}

// Admin-only identities can onboard without losing their independent admin grant.
export function canCreateStudentProfile(
  session: Pick<AuthPolicySession, "role" | "adminRole">
): boolean {
  return (
    session.role === "STUDENT" ||
    (Boolean(session.adminRole) && session.role === null)
  );
}

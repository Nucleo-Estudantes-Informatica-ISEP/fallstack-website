/**
 * "public"     - no session required
 * "session"    - any logged-in user
 * "student"    - logged-in user with a Student profile
 * "employee"   - logged-in user with an Employee profile and a Company
 * "admin"      - logged-in user with session.adminRole set (ADMIN or SUPER_ADMIN)
 * "superadmin" - logged-in user with session.adminRole === "SUPER_ADMIN"
 */
export type AuthPolicy =
  "public" | "session" | "student" | "employee" | "admin" | "superadmin";

export interface AuthPolicySession {
  // Null for an admin-only account - it isn't a STUDENT or EMPLOYEE.
  role: "STUDENT" | "EMPLOYEE" | null;
  // Null means not an admin at all. Orthogonal to role, not a narrowing of it.
  adminRole: "ADMIN" | "SUPER_ADMIN" | null;
  student: unknown;
  employee: { company: unknown } | null;
}

export function passesAuthPolicy(
  policy: AuthPolicy,
  session: AuthPolicySession | null
): boolean {
  if (policy === "public") return true;
  if (!session) return false;
  if (policy === "session") return true;
  if (policy === "student")
    return session.role === "STUDENT" && !!session.student;
  if (policy === "employee")
    return session.role === "EMPLOYEE" && !!session.employee?.company;
  if (policy === "admin") return session.adminRole !== null;
  if (policy === "superadmin") return session.adminRole === "SUPER_ADMIN";
  return false;
}

/**
 * "public"    - no session required
 * "session"   - any logged-in user
 * "student"   - logged-in user with a Student profile
 * "employee"  - logged-in user with an Employee profile and a Company
 * "admin"     - logged-in user with session.isAdmin
 */
export type AuthPolicy =
  | "public"
  | "session"
  | "student"
  | "employee"
  | "admin";

export interface AuthPolicySession {
  role: "STUDENT" | "EMPLOYEE";
  isAdmin: boolean;
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
  if (policy === "admin") return session.isAdmin;
  return false;
}

// Where an account's primary call to action leads. Mirrors the post-sign-in
// routing in completeZitadelSignIn so the homepage, the top bar and a fresh
// AuthNEI sign-in all agree on the same destination for the same account.
export interface AccountDestinationSession {
  role: "STUDENT" | "EMPLOYEE" | null;
  adminRole: "ADMIN" | "SUPER_ADMIN" | null;
  student: { code: string } | null;
  neiMember?: boolean;
}

export type AccountDestination =
  | { kind: "guest"; href: "/signup" }
  | { kind: "admin"; href: "/overview" }
  | { kind: "employee"; href: "/dashboard" }
  | { kind: "student"; href: `/student/${string}` }
  | { kind: "staff"; href: "/attendance/scan" }
  | { kind: "onboarding"; href: "/signup" }
  | { kind: "unresolved"; href: null };

export function resolveAccountDestination(
  session: AccountDestinationSession | null
): AccountDestination {
  if (!session) return { kind: "guest", href: "/signup" };
  // Admin access is orthogonal to role, so it is checked first.
  if (session.adminRole) return { kind: "admin", href: "/overview" };
  if (session.role === "EMPLOYEE")
    return { kind: "employee", href: "/dashboard" };
  if (session.student)
    return { kind: "student", href: `/student/${session.student.code}` };
  // NEI staff accounts (e.g. @nei-isep.org) have no student profile and
  // cannot complete student signup; their place is the attendance scanner.
  if (session.neiMember) return { kind: "staff", href: "/attendance/scan" };
  // A STUDENT session without a Student row abandoned the signup wizard
  // after AuthNEI; /signup resumes it for that session.
  if (session.role === "STUDENT")
    return { kind: "onboarding", href: "/signup" };
  return { kind: "unresolved", href: null };
}

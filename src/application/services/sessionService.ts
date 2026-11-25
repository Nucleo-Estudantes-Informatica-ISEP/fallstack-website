import { APP_SESSION_TTL_SECONDS } from "@/config/sessionLifetime";

import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import config from "@/config";
import { reportError } from "@/lib/logger";
import { resolveAdminRole } from "@/domain/auth/authPolicy";

import { findUserSessionByZitadelUserId } from "../repositories/userRepository";
import { verifyAppSession } from "./zitadelAuthService";

const getServerSession = cache(async () => {
  try {
    const token = (await cookies()).get(config.cookies.auth.name)?.value;
    if (!token) return null;

    const claims = verifyAppSession(token);
    if (!claims) return null;

    const appUser = await findUserSessionByZitadelUserId(claims.sub);
    if (
      !appUser ||
      !appUser.active ||
      (!claims.admin &&
        appUser.role === "EMPLOYEE" &&
        appUser.employee?.company.active === false)
    )
      return null;

    // ZITADEL grant gates admin access; local tier only narrows that grant.
    // Missing tier defaults existing global admins to Super Admin.
    const adminRole = resolveAdminRole(claims.admin, appUser.adminRole);
    const employee =
      appUser.role === "EMPLOYEE" &&
      claims.employee &&
      appUser.employee?.company.active
        ? appUser.employee
        : null;

    return {
      ...appUser,
      employee,
      authName:
        typeof claims.name === "string" ? claims.name.trim() : undefined,
      adminRole,
      neiMember: claims.neiMember === true,
      attendanceExpiresAt:
        typeof claims.iat === "number"
          ? Math.min(
              (claims.iat + APP_SESSION_TTL_SECONDS) * 1000,
              claims.attendanceExpiresAt ?? Infinity
            )
          : 0,
      role: appUser.role === "EMPLOYEE" && !employee ? null : appUser.role,
    };
  } catch (error) {
    reportError(
      error,
      { operation: "get_server_session" },
      "Failed to resolve server session"
    );
    return null;
  }
});

export default getServerSession;

// A blocked account may sign out, but never receives an application session.
export const isCurrentAccountInactive = cache(async () => {
  const token = (await cookies()).get(config.cookies.auth.name)?.value;
  const claims = token ? verifyAppSession(token) : null;
  if (!claims) return false;
  const user = await findUserSessionByZitadelUserId(claims.sub);
  return (
    user?.active === false ||
    (!claims.admin &&
      user?.role === "EMPLOYEE" &&
      user.employee?.company.active === false)
  );
});

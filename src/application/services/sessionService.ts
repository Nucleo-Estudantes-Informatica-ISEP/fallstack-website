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
    if (!appUser || !appUser.active) return null;

    // ZITADEL grant gates admin access; local tier only narrows that grant.
    // Missing tier defaults existing global admins to Super Admin.
    const adminRole = resolveAdminRole(claims.admin, appUser.adminRole);
    const employeeAllowed = claims.employee && !!appUser.employee;

    return {
      ...appUser,
      adminRole,
      role:
        appUser.role === "EMPLOYEE" && !employeeAllowed ? null : appUser.role,
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

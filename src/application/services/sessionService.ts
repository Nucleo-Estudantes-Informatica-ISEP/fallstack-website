import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import config from "@/config";
import { reportError } from "@/lib/logger";

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

    // ZITADEL is authoritative for privileged roles. The DB fields remain
    // useful for domain/profile state, but stale local role data can never
    // manufacture admin/employee authorization by itself.
    const adminRole: "SUPER_ADMIN" | null = claims.admin ? "SUPER_ADMIN" : null;
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

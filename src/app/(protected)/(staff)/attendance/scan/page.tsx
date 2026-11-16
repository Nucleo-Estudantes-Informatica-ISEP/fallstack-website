import { forbidden, redirect } from "next/navigation";

import AttendanceDashboard from "@/components/AttendanceDashboard";
import { getTodaysAttendanceSessions } from "@/application/services/sessionCheckInService";
import getServerSession from "@/application/services/sessionService";
import { canAccessAttendanceScanner } from "@/domain/auth/authPolicy";

export default async function AttendanceScanPage({
  searchParams,
}: {
  searchParams?: Promise<{ session?: string | string[] }>;
}) {
  const session = await getServerSession();
  if (!session) redirect("/api/auth/login?next=%2Fattendance%2Fscan");
  // Role only: the five-minute attendance bound is enforced by the API so a
  // member past it can still reach the "sign in again" prompt.
  if (!canAccessAttendanceScanner(session)) forbidden();

  const sessions = await getTodaysAttendanceSessions();
  const requested = (await searchParams)?.session;
  const initialSessionId =
    typeof requested === "string" &&
    sessions.some((item) => item.id === requested)
      ? requested
      : null;

  return (
    <AttendanceDashboard
      sessions={sessions}
      staffName={session.student?.name ?? session.authName ?? session.email}
      staffEmail={session.email}
      initialSessionId={initialSessionId}
      profileHref={session.student ? `/student/${session.student.code}` : null}
    />
  );
}

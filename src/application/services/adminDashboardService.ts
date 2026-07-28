import "server-only";

import {
  countActionCompletions,
  findActionCompletionTimestampsSince,
  findRecentActionCompletions,
} from "../repositories/actionRepository";
import { countCompaniesForAdmin } from "../repositories/companyRepository";
import { countEmployeesForAdmin } from "../repositories/employeeRepository";
import {
  countAllSavedStudents,
  findRecentSavedStudents,
  findSavedStudentTimestampsSince,
} from "../repositories/savedStudentRepository";
import {
  countStudents,
  findRecentStudents,
  findStudentSignupTimestampsSince,
} from "../repositories/studentRepository";

const ACTIVITY_FEED_LIMIT = 15;
const RECENT_PER_SOURCE = 10;
const WEEKLY_DAYS = 7;

export type ActivityEventType = "signup" | "scan" | "save";

export interface ActivityEvent {
  type: ActivityEventType;
  label: string;
  timestamp: string;
}

export interface DailyActivity {
  date: string;
  signups: number;
  scans: number;
  saves: number;
}

export interface AdminDashboardSummary {
  studentCount: number;
  companyCount: number;
  employeeCount: number;
  actionCompletionCount: number;
  savedStudentCount: number;
  weeklyActivity: DailyActivity[];
  recentActivity: ActivityEvent[];
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

// The window is small enough (a single-event fair, not a high-volume
// product) that fetching raw timestamps and bucketing them here is simpler
// and more portable than a DB-side date_trunc - see the repository
// functions' own comments for the same rationale.
function bucketByDay(timestamps: Date[], days: number) {
  const buckets = new Map<string, number>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    buckets.set(dayKey(day), 0);
  }
  for (const timestamp of timestamps) {
    const key = dayKey(timestamp);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return buckets;
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const since = new Date();
  since.setDate(since.getDate() - (WEEKLY_DAYS - 1));
  since.setHours(0, 0, 0, 0);

  const [
    studentCount,
    companyCount,
    employeeCount,
    actionCompletionCount,
    savedStudentCount,
    recentStudents,
    recentCompletions,
    recentSaves,
    signupTimestamps,
    completionTimestamps,
    saveTimestamps,
  ] = await Promise.all([
    countStudents(),
    countCompaniesForAdmin(),
    countEmployeesForAdmin(),
    countActionCompletions(),
    countAllSavedStudents(),
    findRecentStudents(RECENT_PER_SOURCE),
    findRecentActionCompletions(RECENT_PER_SOURCE),
    findRecentSavedStudents(RECENT_PER_SOURCE),
    findStudentSignupTimestampsSince(since),
    findActionCompletionTimestampsSince(since),
    findSavedStudentTimestampsSince(since),
  ]);

  const events: { type: ActivityEventType; label: string; timestamp: Date }[] =
    [
      ...recentStudents.map((student) => ({
        type: "signup" as const,
        label: `${student.name} juntou-se à Fallstack`,
        timestamp: student.createdAt,
      })),
      ...recentCompletions.map((completion) => ({
        type: "scan" as const,
        label: `${completion.student.name} completou "${completion.action.name}"`,
        timestamp: completion.completedAt,
      })),
      ...recentSaves.map((saved) => ({
        type: "save" as const,
        label: `${saved.company.name} guardou ${saved.student.name}`,
        timestamp: saved.createdAt,
      })),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, ACTIVITY_FEED_LIMIT);

  const signupBuckets = bucketByDay(
    signupTimestamps.map((s) => s.createdAt),
    WEEKLY_DAYS
  );
  const scanBuckets = bucketByDay(
    completionTimestamps.map((c) => c.completedAt),
    WEEKLY_DAYS
  );
  const saveBuckets = bucketByDay(
    saveTimestamps.map((s) => s.createdAt),
    WEEKLY_DAYS
  );

  const weeklyActivity: DailyActivity[] = Array.from(signupBuckets.keys()).map(
    (date) => ({
      date,
      signups: signupBuckets.get(date) ?? 0,
      scans: scanBuckets.get(date) ?? 0,
      saves: saveBuckets.get(date) ?? 0,
    })
  );

  return {
    studentCount,
    companyCount,
    employeeCount,
    actionCompletionCount,
    savedStudentCount,
    weeklyActivity,
    recentActivity: events.map((event) => ({
      ...event,
      timestamp: event.timestamp.toISOString(),
    })),
  };
}

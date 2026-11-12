import "client-only";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import { httpClient } from "@/lib/http/client";
import {
  PRIVACY_POLICY_VERSION,
  TERMS_VERSION,
} from "@/domain/student/signupPolicy";

export async function createStudentProfile(
  data: StudentSignUpData & { avatarId?: string | null; cvId?: string }
) {
  try {
    await httpClient.post("/students", {
      name: data.name?.trim() || undefined,
      bio: data.bio ?? undefined,
      linkedin: data.linkedin?.trim() || undefined,
      year: data.year,
      course: data.course,
      privacyPolicyAccepted: data.privacyPolicyAccepted,
      termsAccepted: data.termsAccepted,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      termsVersion: TERMS_VERSION,
      interests: data.interests,
      avatar: data.avatarId || undefined,
      cvId: data.cvId,
    });
    return true;
  } catch (error) {
    return error instanceof Error ? error : new Error("Network error");
  }
}

export async function signUpEmployee(body: {
  name: string;
  linkedin?: string;
  companyCode: string;
}) {
  try {
    await httpClient.post("/auth/signup/employee", body);
    return true;
  } catch (error) {
    return error instanceof Error ? error : new Error("Network error");
  }
}

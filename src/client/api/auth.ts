import "client-only";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import { httpClient } from "@/lib/http/client";

export async function createStudentProfile(
  data: StudentSignUpData & { avatarUrl?: string | null; cvId?: string }
) {
  try {
    await httpClient.post("/students", {
      name: data.name,
      bio: data.bio,
      year: data.year,
      interests: data.interests,
      avatarUrl: data.avatarUrl || undefined,
      cvId: data.cvId,
    });
    return true;
  } catch (error) {
    return error instanceof Error ? error : new Error("Network error");
  }
}

export async function logIn(email: string, password: string) {
  try {
    await httpClient.post("/auth/login", { email, password });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function signUpEmployee(body: {
  email: string;
  password: string;
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

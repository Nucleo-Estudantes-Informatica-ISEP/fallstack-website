import { StudentSignUpData } from "@/types/StudentSignUpData";
import { BASE_URL } from "@/services/api";

export async function signUp(data: StudentSignUpData) {
  try {
    const signUpResponse = await fetch(BASE_URL + "/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: data.email,
        password: data.password,
      }),
    });

    if (!signUpResponse.ok) {
      const json = await signUpResponse.json().catch(() => ({}));
      return new Error(json.message || json.error || "Unable to sign up");
    }

    const resStudent = await fetch(BASE_URL + "/students", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        bio: data.bio,
        year: data.year,
        interests: data.interests,
        avatarUrl: (data as any).avatarUrl || undefined,
        cvId: data.cv?.id,
      }),
    });

    const json = await resStudent.json();

    if (resStudent.status !== 201) return new Error(json.error);
    return true;
  } catch (error) {
    return new Error(error instanceof Error ? error.message : "Network error");
  }
}

export async function logIn(email: string, password: string) {
  try {
    const res = await fetch(BASE_URL + "/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    return res.status === 200;
  } catch (e) {
    console.error(e);
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
    const res = await fetch(BASE_URL + "/auth/signup/employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return new Error(
        json?.message || json?.error || "Unable to sign up employee"
      );
    }

    return true;
  } catch (error) {
    return new Error(error instanceof Error ? error.message : "Network error");
  }
}

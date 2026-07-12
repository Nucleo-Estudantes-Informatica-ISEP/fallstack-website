import { StudentSignUpData } from "@/types/StudentSignUpData";
import { BASE_URL } from "@/services/api";

export async function signUp(data: StudentSignUpData) {
  try {
    await fetch(BASE_URL + "/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: data.email,
        password: data.password,
      }),
    });

    const resStudent = await fetch(BASE_URL + "/students", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        bio: data.bio,
        year: data.year,
        interests: data.interests,
        avatarUrl: data.avatarUrl || undefined,
        cvId: data.cv?.id,
      }),
    });

    const json = await resStudent.json();

    if (resStudent.status !== 201) return new Error(json.error);
    return true;
  } catch (e) {
    console.error(e);
    return false;
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
  } catch (e) {
    return new Error(e instanceof Error ? e.message : "Network error");
  }
}

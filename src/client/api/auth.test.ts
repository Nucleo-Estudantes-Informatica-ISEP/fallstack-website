import { beforeEach, expect, test, vi } from "vitest";

import type { StudentSignUpData } from "@/types/StudentSignUpData";
import { httpClient } from "@/lib/http/client";
import { STUDENT_YEAR } from "@/domain/student/year";
import { postStudentSchema } from "@/schemas/postStudentSchema";

import { createStudentProfile } from "./auth";

vi.mock("client-only", () => ({}));
vi.mock("@/lib/http/client", () => ({
  httpClient: { post: vi.fn() },
}));

const signUpData: StudentSignUpData = {
  name: "Jane Doe",
  email: "jane@isep.ipp.pt",
  password: "password123",
  bio: "Bio",
  interests: [],
  cv: null,
  avatar: null,
  year: STUDENT_YEAR.LICENCIATURA_3,
  course: "LEI",
  privacyPolicyAccepted: true,
  termsAccepted: true,
  linkedin: null,
};

beforeEach(() => vi.clearAllMocks());

test("sends the uploaded avatar id so the server builds the public URL", async () => {
  const avatarId = "3f2b8c1e-6d4a-4b7e-9a1c-2d5e8f0a7b34";
  vi.mocked(httpClient.post).mockResolvedValue(undefined);

  expect(await createStudentProfile({ ...signUpData, avatarId })).toBe(true);

  const [path, body] = vi.mocked(httpClient.post).mock.calls[0];
  expect(path).toBe("/students");
  expect(body).toMatchObject({ avatar: avatarId });
  expect(body).not.toHaveProperty("avatarUrl");
  expect(postStudentSchema.safeParse(body).success).toBe(true);
});

test("omits the avatar when none was uploaded", async () => {
  vi.mocked(httpClient.post).mockResolvedValue(undefined);

  await createStudentProfile({ ...signUpData, avatarId: null });

  const [, body] = vi.mocked(httpClient.post).mock.calls[0];
  expect(postStudentSchema.safeParse(body).success).toBe(true);
  expect(body).toMatchObject({ avatar: undefined });
});

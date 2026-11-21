import { z } from "zod";

import type { StudentSignUpData } from "@/types/StudentSignUpData";

const draftAnswers = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  bio: z.string().nullable(),
  interests: z.array(z.string()),
  year: z.string().nullable(),
  course: z.string().optional(),
  linkedin: z.string().nullable(),
});

const draftSchema = z.object({
  step: z.number().int().min(0).max(3),
  answers: draftAnswers,
});

const keyFor = (accountId: string) =>
  `fallstack:student-signup:v1:${accountId}`;

export function readStudentDraft(accountId: string) {
  try {
    const saved = window.localStorage.getItem(keyFor(accountId));
    if (!saved) return;
    const draft = draftSchema.safeParse(JSON.parse(saved));
    if (draft.success) return draft.data;
  } catch {
    // Browser storage may be unavailable or the saved draft may be malformed.
  }
}

export function saveStudentDraft(
  accountId: string,
  step: number,
  { name, email, bio, interests, year, course, linkedin }: StudentSignUpData
) {
  try {
    window.localStorage.setItem(
      keyFor(accountId),
      JSON.stringify({
        step,
        answers: { name, email, bio, interests, year, course, linkedin },
      })
    );
  } catch {
    // The form still works when browser storage is unavailable.
  }
}

export function clearStudentDraft(accountId: string) {
  try {
    window.localStorage.removeItem(keyFor(accountId));
  } catch {
    // Completion still succeeds when browser storage is unavailable.
  }
}

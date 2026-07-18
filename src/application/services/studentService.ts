import "server-only";

import { z } from "zod";

import { HttpError } from "@/types/HttpError";
import { parseStudentYear, studentYearLabel } from "@/domain/Student/year";
import { actionNames } from "@/edition/actions";
import { patchStudentSchema } from "@/schemas/patchStudentSchema";
import { postStudentSchema } from "@/schemas/postStudentSchema";
import generateRandomCode from "@/utils/GenerateCode";
import { createAdminClient } from "@/utils/supabase/admin";

import { isAllowedToViewStudent } from "../domain/studentAccess";
import type { StudentAccess } from "../domain/studentAccess";
import { isStudentSaved } from "../repositories/savedStudentRepository";
import {
  createStudent,
  findAllStudents,
  findStudentAvatar,
  findStudentByCode,
  findStudentInterests,
  findStudentProfileByCode,
  findStudentsForGiveaway,
  updateStudentAvatar,
  updateStudentCv,
  updateStudentMedia,
  updateStudentProfile,
} from "../repositories/studentRepository";
import { withTransaction } from "../repositories/transaction";
import {
  connectUserInterests,
  setUserInterests,
} from "../repositories/userRepository";
import { completeAction } from "./actionService";

type NewStudent = z.infer<typeof postStudentSchema>;
type StudentPatch = z.infer<typeof patchStudentSchema>;

export async function createStudentProfile(userId: string, body: NewStudent) {
  let code: string;
  do code = generateRandomCode();
  while (await findStudentByCode(code));

  // External I/O (Supabase Storage) stays outside the transaction below —
  // no network calls while holding a DB transaction open.
  let avatarUrl = body.avatarUrl ?? null;
  if (!avatarUrl && body.avatar) {
    const admin = createAdminClient();
    const path = `distribution/avatar/${body.avatar}`;
    const check = await admin.storage.from("avatars").createSignedUrl(path, 60);
    if (check.error) throw new HttpError("Invalid avatar upload id", 400);
    avatarUrl = admin.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }
  const cv = body.cvId ?? null;

  return withTransaction(async (tx) => {
    const student = await createStudent(
      {
        userId,
        code,
        name: body.name,
        bio: body.bio,
        year: parseStudentYear(body.year),
      },
      tx
    );
    await connectUserInterests(userId, body.interests, tx);
    await completeAction(code, actionNames.createProfile, tx);
    if (cv) await completeAction(code, actionNames.uploadCv, tx);
    await updateStudentMedia(student.id, { avatar: avatarUrl, cv }, tx);
    return student;
  });
}

export async function getStudentProfile(code: string, access: StudentAccess) {
  const student = await findStudentProfileByCode(code);
  if (!student) throw new HttpError("Not found", 404);
  if (!(await isAllowedToViewStudent(code, access, isStudentSaved)))
    throw new HttpError("Not found", 404);
  return student;
}

export async function updateStudent(
  userId: string,
  code: string,
  body: StudentPatch
) {
  return withTransaction(async (tx) => {
    const student = await updateStudentProfile(code, body, tx);
    if (student.linkedin)
      await completeAction(code, actionNames.updateLinkedin, tx);
    if (body.interests) await setUserInterests(userId, body.interests, tx);
    return student;
  });
}

export const setStudentAvatar = (code: string, url: string) =>
  updateStudentAvatar(code, url);

export async function setStudentCv(code: string, id: string) {
  const check = await createAdminClient()
    .storage.from("cvs")
    .createSignedUrl(`distribution/cv/${id}.pdf`, 60);
  if (check.error) throw new HttpError("Invalid upload id", 400);
  await withTransaction(async (tx) => {
    await updateStudentCv(code, id, tx);
    await completeAction(code, actionNames.uploadCv, tx);
  });
}

export async function getStudentCv(code: string, access: StudentAccess) {
  const student = await findStudentByCode(code);
  if (
    !student ||
    !(await isAllowedToViewStudent(code, access, isStudentSaved)) ||
    !student.cv
  )
    throw new HttpError("CV not found", 404);
  const signed = await createAdminClient()
    .storage.from("cvs")
    .createSignedUrl(`distribution/cv/${student.cv}.pdf`, 60 * 5);
  if (signed.error || !signed.data) throw new HttpError("CV not found", 404);
  return signed.data.signedUrl;
}

export const getStudent = (code: string) => findStudentProfileByCode(code);
export const getStudents = () => findAllStudents();
export const getAvatar = (id: string) => findStudentAvatar(id);
export const getStudentInterests = (id: string) => findStudentInterests(id);

export async function getStudentsForGiveaway() {
  const students = await findStudentsForGiveaway();
  return students
    .map((student) => ({
      user: { email: student.user.email },
      id: student.id,
      code: student.code,
      name: student.name,
      bio: student.bio,
      year: studentYearLabel(student.year),
      cv: student.cv,
      linkedin: student.linkedin,
      numberOfTotalPoints: student.actionCompletions.reduce(
        (sum, completion) => sum + completion.action.points,
        0
      ),
    }))
    .filter(({ numberOfTotalPoints }) => numberOfTotalPoints > 0);
}

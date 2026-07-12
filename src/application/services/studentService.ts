import "server-only";

import { z } from "zod";

import { HttpError } from "@/types/HttpError";
import config from "@/config";
import { patchStudentSchema } from "@/schemas/patchStudentSchema";
import { postStudentSchema } from "@/schemas/postStudentSchema";
import generateRandomCode from "@/utils/GenerateCode";
import { createAdminClient } from "@/utils/supabase/admin";

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

  const student = await createStudent({
    userId,
    code,
    name: body.name,
    bio: body.bio,
    year: body.year,
  });
  await connectUserInterests(userId, body.interests);
  await completeAction(code, config.constants.actionNames.createProfile);

  let avatarUrl = body.avatarUrl ?? null;
  if (!avatarUrl && body.avatar) {
    const admin = createAdminClient();
    const path = `distribution/avatar/${body.avatar}`;
    const check = await admin.storage.from("avatars").createSignedUrl(path, 60);
    if (check.error) throw new HttpError("Invalid avatar upload id", 400);
    avatarUrl = admin.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  const cv = body.cvId ?? null;
  if (cv) await completeAction(code, config.constants.actionNames.uploadCv);
  await updateStudentMedia(student.id, { avatar: avatarUrl, cv });
  return student;
}

export async function getStudentProfile(
  code: string,
  access: { studentCode?: string; companyId?: string; isAdmin: boolean }
) {
  const student = await findStudentProfileByCode(code);
  if (!student) throw new HttpError("Not found", 404);
  const allowed =
    access.studentCode === code ||
    access.isAdmin ||
    (!!access.companyId && (await isStudentSaved(access.companyId, code)));
  if (!allowed) throw new HttpError("Not found", 404);
  return student;
}

export async function updateStudent(
  userId: string,
  code: string,
  body: StudentPatch
) {
  const student = await updateStudentProfile(code, body);
  if (student.linkedin)
    await completeAction(code, config.constants.actionNames.updateLinkedin);
  if (body.interests) await setUserInterests(userId, body.interests);
  return student;
}

export const setStudentAvatar = (code: string, url: string) =>
  updateStudentAvatar(code, url);

export async function setStudentCv(code: string, id: string) {
  const check = await createAdminClient()
    .storage.from("cvs")
    .createSignedUrl(`distribution/cv/${id}.pdf`, 60);
  if (check.error) throw new HttpError("Invalid upload id", 400);
  await updateStudentCv(code, id);
  await completeAction(code, config.constants.actionNames.uploadCv);
}

export async function getStudentCv(
  code: string,
  access: { studentCode?: string; companyId?: string; isAdmin: boolean }
) {
  const student = await findStudentByCode(code);
  const allowed =
    student &&
    (access.studentCode === code ||
      access.isAdmin ||
      (!!access.companyId && (await isStudentSaved(access.companyId, code))));
  if (!allowed || !student.cv) throw new HttpError("CV not found", 404);
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
      year: student.year,
      cv: student.cv,
      linkedin: student.linkedin,
      numberOfTotalPoints: student.actionCompletions.reduce(
        (sum, completion) => sum + completion.action.points,
        0
      ),
    }))
    .filter(({ numberOfTotalPoints }) => numberOfTotalPoints > 0);
}

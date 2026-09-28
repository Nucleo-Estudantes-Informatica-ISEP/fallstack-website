import "server-only";

import { z } from "zod";

import { Email } from "@/types/Email";
import { HttpError } from "@/types/HttpError";
import { isAllowedToViewStudent } from "@/domain/student/studentAccess";
import type { StudentAccess } from "@/domain/student/studentAccess";
import {
  parseStudentYear,
  studentYearLabel,
  type StudentYear,
} from "@/domain/student/year";
import { actionNames } from "@/edition/actions";
import { patchStudentSchema } from "@/schemas/patchStudentSchema";
import { postStudentSchema } from "@/schemas/postStudentSchema";
import generateRandomCode from "@/utils/GenerateCode";

import { isStudentSaved } from "../repositories/savedStudentRepository";
import {
  connectStudentInterests,
  countStudents,
  countStudentsForAdmin,
  createStudent,
  findAllStudents,
  findStudentAvatar,
  findStudentByCode,
  findStudentInterests,
  findStudentProfileByCode,
  findStudentProfileById,
  findStudentsForAdmin,
  findStudentsForGiveaway,
  setStudentInterests,
  updateStudentAvatar,
  updateStudentCv,
  updateStudentFields,
  updateStudentMedia,
  updateStudentProfile,
  type AdminStudentQuery,
} from "../repositories/studentRepository";
import { withTransaction } from "../repositories/transaction";
import { updateUserActive, upsertUser } from "../repositories/userRepository";
import { completeAction } from "./actionService";
import {
  createSupabaseAuthUserAsAdmin,
  deleteUserAccount,
  rollbackAuthUser,
  setAuthUserBanned,
} from "./authApplicationService";
import {
  avatarKey,
  cvKey,
  getObject,
  objectExists,
  publicAvatarUrl,
} from "./objectStorageService";

type NewStudent = z.infer<typeof postStudentSchema>;
type StudentPatch = z.infer<typeof patchStudentSchema>;

export async function createStudentProfile(userId: string, body: NewStudent) {
  let code: string;
  do code = generateRandomCode();
  while (await findStudentByCode(code));

  // External storage I/O stays outside the transaction below —
  // no network calls while holding a DB transaction open.
  let avatarUrl = body.avatarUrl ?? null;
  if (!avatarUrl && body.avatar) {
    if (!(await objectExists("avatar", avatarKey(body.avatar))))
      throw new HttpError("Invalid avatar upload id", 400);
    avatarUrl = publicAvatarUrl(body.avatar);
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
    await connectStudentInterests(userId, body.interests, tx);
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
    if (body.interests) await setStudentInterests(userId, body.interests, tx);
    return student;
  });
}

export const setStudentAvatar = (code: string, url: string) =>
  updateStudentAvatar(code, url);

export async function setStudentCv(code: string, id: string) {
  if (!(await objectExists("cv", cvKey(id))))
    throw new HttpError("Invalid upload id", 400);
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
  return `/api/students/${encodeURIComponent(code)}/cv/file`;
}

export async function downloadStudentCv(code: string, access: StudentAccess) {
  const student = await findStudentByCode(code);
  if (
    !student ||
    !(await isAllowedToViewStudent(code, access, isStudentSaved)) ||
    !student.cv
  )
    throw new HttpError("CV not found", 404);
  const file = await getObject("cv", cvKey(student.cv));
  if (!file) throw new HttpError("CV not found", 404);
  return file;
}

export const getStudent = (code: string) => findStudentProfileByCode(code);
export const getStudentById = (id: string) => findStudentProfileById(id);
export const getStudents = () => findAllStudents();
export const getStudentCount = () => countStudents();

export async function listStudentsForAdmin(query: AdminStudentQuery) {
  const [items, totalCount] = await Promise.all([
    findStudentsForAdmin(query),
    countStudentsForAdmin(query.search),
  ]);
  return { items, totalCount };
}

export async function createStudentForAdmin(input: {
  email: string;
  password: string;
  code: string;
  name: string;
  year: StudentYear;
  bio?: string;
}) {
  if (await findStudentByCode(input.code))
    throw new HttpError("That student code is already in use", 409);

  const authUser = await createSupabaseAuthUserAsAdmin(
    input.email,
    input.password
  );
  try {
    return await withTransaction(async (tx) => {
      await upsertUser(
        { id: authUser.id, email: Email.create(input.email), role: "STUDENT" },
        tx
      );
      return createStudent(
        {
          userId: authUser.id,
          code: input.code,
          name: input.name,
          bio: input.bio,
          year: input.year,
        },
        tx
      );
    });
  } catch (error) {
    await rollbackAuthUser(authUser.id);
    throw error;
  }
}

export async function updateStudentForAdmin(
  id: string,
  input: {
    name?: string;
    bio?: string | null;
    year?: StudentYear;
    linkedin?: string | null;
    github?: string | null;
    avatar?: string | null;
    password?: string;
    active?: boolean;
  }
) {
  const { password: _password, avatar, active, ...profile } = input;
  void _password;
  const student = await updateStudentFields(id, profile);
  if (avatar !== undefined) await updateStudentMedia(id, { avatar });
  if (active !== undefined) {
    await updateUserActive(id, active);
    await setAuthUserBanned(id, !active);
  }
  return student;
}

export const deleteStudentForAdmin = (id: string) => deleteUserAccount(id);
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

import { z } from "zod";

export const studentAvatarIdSchema = z.uuid();
export const studentAvatarUrlSchema = z.string().refine((url) => {
  const prefix = "/api/media/avatar/";
  return (
    url.startsWith(prefix) &&
    studentAvatarIdSchema.safeParse(url.slice(prefix.length)).success
  );
}, "Use an uploaded FallStack avatar");

export const setStudentAvatarSchema = z.object({ url: studentAvatarUrlSchema });

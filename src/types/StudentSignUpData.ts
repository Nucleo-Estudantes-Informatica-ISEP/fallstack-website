export interface StudentSignUpData {
  name: string | null;
  email: string | null;
  password: string | null;
  bio: string | null;
  interests: string[];
  cv: {
    name: string;
    file: File;
    preview: string;
  } | null;
  avatar: string | null;
  avatarUrl?: string | null;
  year: string | null;
  linkedin: string | null;
}

"use client";

import Link from "next/link";
import { LiaUser } from "react-icons/lia";

import type { SessionDto } from "@/application/dto/sessionDto";

interface UserButtonProps {
  user: SessionDto;
}

const UserButton: React.FC<UserButtonProps> = ({ user }) => {
  // A STUDENT-role session can exist with no Student row yet - e.g. AuthNEI
  // established the account but the signup wizard was abandoned or
  // interrupted before the profile step. Route back into the wizard to
  // finish it instead of a dead link. An admin account has role: null and
  // no student profile either, but for an entirely different reason (it
  // isn't a STUDENT/EMPLOYEE at all) - checked first so it doesn't fall
  // into that same "unfinished student signup" branch.
  const profileUrl = user.adminRole
    ? "/students"
    : user.role === "EMPLOYEE"
      ? "/dashboard"
      : user.student
        ? "/student/" + user.student.code
        : "/signup";

  return (
    <Link
      href={profileUrl}
      className="z-20 flex size-full items-center justify-center fill-white text-2xl transition-colors hover:text-primary"
    >
      <LiaUser />
    </Link>
  );
};

export default UserButton;

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
  // finish it instead of a dead link.
  const profileUrl =
    user.role === "EMPLOYEE"
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

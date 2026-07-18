"use client";

import Link from "next/link";
import { LiaUser } from "react-icons/lia";

import type { SessionDto } from "@/application/dto/sessionDto";

interface UserButtonProps {
  user: SessionDto;
}

const UserButton: React.FC<UserButtonProps> = ({ user }) => {
  const profileUrl =
    user.role === "EMPLOYEE"
      ? "/dashboard"
      : !!user.student
        ? "/student/" + user.student.code
        : "";

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

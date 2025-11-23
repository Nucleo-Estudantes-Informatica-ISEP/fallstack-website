"use client";

import Link from "next/link";
import { LiaUser } from "react-icons/lia";

import { UserWithProfile } from "@/types/UserWithProfile";

interface UserButtonProps {
  user: UserWithProfile;
}

const UserButton: React.FC<UserButtonProps> = ({ user }) => {
  const profileUrl =
    user.role === "COMPANY" && !!user.company
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

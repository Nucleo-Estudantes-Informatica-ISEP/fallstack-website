"use client";

import Link from "next/link";
import { LiaUser } from "react-icons/lia";
import { MdOutlineAdminPanelSettings } from "react-icons/md";

import type { SessionDto } from "@/application/dto/sessionDto";
import { resolveAccountDestination } from "@/domain/auth/accountDestination";

interface UserButtonProps {
  user: SessionDto;
}

const UserButton: React.FC<UserButtonProps> = ({ user }) => {
  // Shares its routing with the homepage call to action, so both always lead
  // the same account to the same place. An account without a usable role
  // keeps the previous /signup fallback.
  const profileUrl = resolveAccountDestination(user).href ?? "/signup";

  return (
    <Link
      href={profileUrl}
      aria-label={user.adminRole ? "Área de administração" : "O meu perfil"}
      className="z-20 flex size-full items-center justify-center fill-white text-2xl transition-colors hover:text-primary"
    >
      {/* A distinct icon for admins - this doesn't lead to a personal
          profile like it does for everyone else, it opens the admin
          section, so it shouldn't look like a "your profile" link. */}
      {user.adminRole ? <MdOutlineAdminPanelSettings /> : <LiaUser />}
    </Link>
  );
};

export default UserButton;

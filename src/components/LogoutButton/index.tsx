"use client";

import { BiLogOut } from "react-icons/bi";

import { useLogout } from "@/hooks/useLogout";

interface LogoutButtonProps {
  // See UserButton's `light` prop - same reasoning (TopBar's icons default
  // to white, invisible on the admin backoffice's light background).
  light?: boolean;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ light = false }) => {
  const { handleLogout, ConfirmDialog } = useLogout();

  return (
    <>
      <button
        onClick={handleLogout}
        aria-label="Terminar sessão"
        className={`flex size-full items-center justify-center text-xl transition-colors hover:text-primary ${light ? "fill-gray-700" : "fill-white"}`}
      >
        <BiLogOut />
      </button>
      {ConfirmDialog}
    </>
  );
};

export default LogoutButton;

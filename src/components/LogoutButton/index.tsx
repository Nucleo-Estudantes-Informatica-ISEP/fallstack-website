"use client";

import { BiLogOut } from "react-icons/bi";

import { useLogout } from "@/hooks/useLogout";

const LogoutButton: React.FC = () => {
  const { handleLogout, ConfirmDialog } = useLogout();

  return (
    <>
      <button
        onClick={handleLogout}
        aria-label="Terminar sessão"
        className="flex size-full items-center justify-center fill-white text-xl transition-colors hover:text-primary"
      >
        <BiLogOut />
      </button>
      {ConfirmDialog}
    </>
  );
};

export default LogoutButton;

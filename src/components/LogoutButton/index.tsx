"use client";

import { BiLogOut } from "react-icons/bi";

import { useLogout } from "@/hooks/useLogout";
import { useUiText } from "@/contexts/UiLanguageContext";
import { Language } from "@/domain/i18n/translations";

const LogoutButton: React.FC<{ language?: Language }> = ({
  language = Language.PT,
}) => {
  const t = useUiText();

  const { handleLogout, ConfirmDialog } = useLogout();

  return (
    <>
      <button
        onClick={handleLogout}
        aria-label={
          language === Language.EN ? "Sign out" : t("Terminar sessão")
        }
        className="flex size-full items-center justify-center fill-white text-xl transition-colors hover:text-primary"
      >
        <BiLogOut />
      </button>
      {ConfirmDialog}
    </>
  );
};

export default LogoutButton;

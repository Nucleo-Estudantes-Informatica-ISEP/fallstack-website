"use client";

import { useState } from "react";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import { useUiText } from "@/contexts/UiLanguageContext";
import ConfirmDialog from "@/components/ConfirmDialog";

import useSession from "./useSession";

export function useLogout() {
  const t = useUiText();
  const session = useSession();
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const confirmLogout = async (scope: "app" | "shared") => {
    setIsLoggingOut(true);
    try {
      const { logoutUrl } = await httpClient.post<{ logoutUrl: string }>(
        `/auth/logout?scope=${scope}`
      );
      session.clear();
      setIsConfirmVisible(false);
      window.location.assign(logoutUrl);
    } catch {
      toast.error(t("Não foi possível terminar a sessão."));
      setIsLoggingOut(false);
    }
  };

  return {
    handleLogout: () => setIsConfirmVisible(true),
    ConfirmDialog: (
      <ConfirmDialog
        isVisible={isConfirmVisible}
        setIsVisible={setIsConfirmVisible}
        title="Terminar sessão"
        message="Outras aplicações abertas podem manter a sessão iniciada."
        confirmLabel="Terminar sessão só nesta aplicação"
        cancelLabel="Cancelar"
        onConfirm={() => confirmLogout("app")}
        alternativeAction={{
          label: "Terminar sessão nesta aplicação e no AuthNEI",
          onClick: () => confirmLogout("shared"),
        }}
        isConfirming={isLoggingOut}
      />
    ),
  };
}

"use client";

import { useState } from "react";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import ConfirmDialog from "@/components/ConfirmDialog";

import useSession from "./useSession";

export function useLogout() {
  const session = useSession();
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { logoutUrl } = await httpClient.post<{ logoutUrl: string }>(
        "/auth/logout"
      );
      session.clear();
      setIsConfirmVisible(false);
      window.location.assign(logoutUrl);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível terminar a sessão."
      );
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
        message="Queres mesmo sair?"
        confirmLabel="Sair"
        cancelLabel="Cancelar"
        onConfirm={confirmLogout}
        isConfirming={isLoggingOut}
      />
    ),
  };
}

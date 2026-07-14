"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import ConfirmDialog from "@/components/ConfirmDialog";

import useSession from "./useSession";

export function useLogout() {
  const session = useSession();
  const router = useRouter();
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await httpClient.post("/auth/logout");

      session.clear();
      toast.success("Sessão terminada com sucesso");
      setIsConfirmVisible(false);
      router.push("/");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível terminar a sessão."
      );
    } finally {
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

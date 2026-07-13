"use client";

import { useRouter } from "next/navigation";
import swal from "sweetalert";

import { BASE_URL } from "@/services/api";

import useSession from "./useSession";

export function useLogout() {
  const session = useSession();
  const router = useRouter();

  return async () => {
    const confirmed = await swal("Queres mesmo mesmo sair?", {
      buttons: ["Cancelar", "Sair"],
      title: "Terminar sessão",
      icon: "warning",
      dangerMode: true,
      timer: 5000,
    });

    if (!confirmed) return;

    try {
      const res = await fetch(BASE_URL + "/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Não foi possível terminar a sessão.");

      session.clear();
      await swal("Logout", "Sessão terminada com sucesso", "success");
      router.push("/");
    } catch (error) {
      swal(
        "Erro",
        error instanceof Error
          ? error.message
          : "Não foi possível terminar a sessão.",
        "error"
      );
    }
  };
}

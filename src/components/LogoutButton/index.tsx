"use client";

import { useRouter } from "next/navigation";
import { BiLogOut } from "react-icons/bi";
import swal from "sweetalert";

import { httpClient } from "@/lib/http/client";
import useSession from "@/hooks/useSession";

const LogoutButton: React.FC = () => {
  const session = useSession();
  const router = useRouter();

  const handleClick = async () => {
    swal("Queres mesmo mesmo sair?", {
      buttons: ["Cancelar", "Sair"],
      title: "Terminar sessão",
      icon: "warning",
      dangerMode: true,
      timer: 5000,
    }).then(async (value) => {
      if (value) {
        try {
          await httpClient.post("/auth/logout");
          session.clear();
          swal("Logout", "Sessão terminada com sucesso", "success");
          router.push("/");
        } catch {
          // preserve existing behavior: silently do nothing on failure
        }
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Terminar sessão"
      className="flex size-full items-center justify-center fill-white text-xl transition-colors hover:text-primary"
    >
      <BiLogOut />
    </button>
  );
};

export default LogoutButton;

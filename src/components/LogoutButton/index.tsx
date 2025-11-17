"use client";

import { useRouter } from "next/navigation";
import { BiLogOut } from "react-icons/bi";
import swal from "sweetalert";

import useSession from "@/hooks/useSession";
import { BASE_URL } from "@/services/api";

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
        const res = await fetch(BASE_URL + "/auth/logout", { method: "POST" });
        if (res.status === 200) {
          session.clear();
          swal("Logout", "Sessão terminada com sucesso", "success");
          router.push("/");
        }
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      className="flex size-full items-center justify-center  fill-white text-xl transition-colors hover:text-primary"
    >
      <BiLogOut />
    </button>
  );
};

export default LogoutButton;

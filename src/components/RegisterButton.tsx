"use client";

import { useContext } from "react";
import Link from "next/link";
import AuthContext from "@/contexts/AuthContext";

export default function RegisterButton() {
  // Consome o contexto diretamente usando o hook nativo do React
  const auth = useContext(AuthContext);
  const user = auth?.user;

  return (
    <div className="flex justify-center w-full my-8">
      <Link
        href={user ? "/profile" : "/signup"}
        className="px-8 py-3 text-base font-medium text-white bg-[#111111] rounded-xl transition-all duration-200 hover:bg-black hover:scale-105 active:scale-95 shadow-md inline-block"
      >
        {user ? "Ver Perfil" : "Registar Agora"}
      </Link>
    </div>
  );
}

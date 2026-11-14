"use client";

import { useContext } from "react";
import Link from "next/link";

import AuthContext from "@/contexts/AuthContext";

export default function RegisterButton() {
  // Consome o contexto diretamente usando o hook nativo do React
  const auth = useContext(AuthContext);
  const user = auth?.user;

  return (
    <div className="my-8 flex w-full justify-center">
      <Link
        href={user ? "/profile" : "/signup"}
        className="inline-block rounded-xl bg-[#111111] px-8 py-3 text-base font-medium text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-black active:scale-95"
      >
        {user ? "Ver Perfil" : "Registar Agora"}
      </Link>
    </div>
  );
}

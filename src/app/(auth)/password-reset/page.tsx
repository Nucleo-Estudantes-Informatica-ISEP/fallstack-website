"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import swal from "sweetalert";

import Input from "@/components/Input";
import PrimaryButton from "@/components/PrimaryButton";

const RequestResetPage: React.FC = () => {
  const emailRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    if (!emailRef.current?.value) return setError("Insere o teu email.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailRef.current?.value }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Algo correu mal");
        setLoading(false);
        return;
      }

      swal(
        "Pedido enviado",
        "Se a conta existir, receberás um email com instruções.",
        "success"
      );
      setLoading(false);
    } catch (e) {
      console.error(e);
      setError("Erro de servidor");
      setLoading(false);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleClick();
  };

  return (
    <div className="relative max-h-[90vh] w-full overflow-hidden md:mt-4">
      <section className="flex max-h-[85vh] flex-col overflow-y-auto">
        <h1 className="mb-8 w-full text-center font-sans text-[24px] font-semibold text-white md:text-left md:text-[45px]">
          Recuperar Password
        </h1>

        <div className="w-full">
          <Input
            name="Email"
            inputRef={emailRef}
            onKeyUp={handleKeyUp}
            className="!rounded-none !border-[rgba(255,255,255,0.35)] bg-transparent px-3 py-2 text-white placeholder:text-gray-500 sm:py-3"
          />
        </div>

        {error && (
          <motion.p
            className="mt-1 text-sm font-bold text-red-600"
            animate={{
              y: [-15, 0],
            }}
            transition={{
              ease: "easeOut",
              duration: 0.2,
            }}
          >
            {error}
          </motion.p>
        )}

        <div className="mt-6 w-full">
          <PrimaryButton
            loading={loading}
            onClick={handleClick}
            className="!flex w-full cursor-pointer !items-center !justify-center !rounded-none !bg-[#B1440A] !px-3 py-3 !text-[17px] font-semibold !tracking-normal hover:!bg-[#8d3508] sm:py-4 sm:!text-[19px]"
          >
            Enviar e-mail de recuperação
          </PrimaryButton>
        </div>
      </section>
    </div>
  );
};

export default RequestResetPage;

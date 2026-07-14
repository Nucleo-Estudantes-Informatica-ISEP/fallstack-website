"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import swal from "sweetalert";

import { httpClient, HttpClientError } from "@/lib/http/client";
import useIsMobile from "@/hooks/useIsMobile";
import { useMutation } from "@/hooks/useMutation";
import ScanTab from "@/components/QRCode/QRCodeTab/ScanTab";
import { jwtStudent } from "@/application/services/studentTokenService";

import { BsFillClipboardFill } from "react-icons/bs";

interface CompanyTabProps {
  setHidden: React.Dispatch<React.SetStateAction<boolean>>;
}

const CompanyTab: React.FC<CompanyTabProps> = ({ setHidden }) => {
  const isMobile = useIsMobile();
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending } = useMutation("Ocorreu um erro.");

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleClick();
  };

  const handleClick = () =>
    mutate(async () => {
      if (!inputRef.current?.value) {
        toast.error("Sem código inserido.");
        return;
      }

      const code = inputRef.current?.value;
      const token = await jwtStudent(code);

      if (!token) {
        swal("Erro", "O código introduzido é inválido.", "error");
        return;
      }

      try {
        await httpClient.post("/saved", { code });
      } catch (error) {
        if (error instanceof HttpClientError && error.status === 409) {
          swal(
            "Aviso",
            "Este estudante já foi guardado anteriormente.",
            "warning"
          );
          return;
        }
        throw error;
      }

      router.push(`/student/${token}/preview`);
      setHidden(true);
    });

  return (
    <div className="mt-14 flex flex-col items-center justify-center">
      {!isMobile ? (
        <>
          <div className="flex flex-col items-center justify-center pt-14 pb-0 sm:py-0">
            <div className="mt-14 rounded-xl bg-gray-200 p-2 sm:p-2 md:p-6">
              <div className="my-2 flex items-center justify-center">
                <BsFillClipboardFill size={20} className="fill-black" />
                <input
                  type="text"
                  name="Insere o código do estudante."
                  className={`z-10 ml-2 bg-slate-100 p-2 text-center text-xl font-bold text-black uppercase`}
                  ref={inputRef}
                  onKeyUp={handleKeyUp}
                  maxLength={4}
                  disabled={isPending}
                />
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              initial={{ scale: 1 }}
              onClick={handleClick}
              disabled={isPending}
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-lg font-bold text-white hover:opacity-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "A processar..." : "Ir para o perfil"}
            </motion.button>
          </div>
        </>
      ) : (
        <ScanTab setHidden={setHidden} />
      )}
    </div>
  );
};

export default CompanyTab;

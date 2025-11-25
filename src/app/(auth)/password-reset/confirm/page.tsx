"use client";

import { useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import swal from "sweetalert";

import useSession from "@/hooks/useSession";
import Input from "@/components/Input";
import PrimaryButton from "@/components/PrimaryButton";

const PasswordResetForm: React.FC = () => {
  const session = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [codeError, setCodeError] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [repeatPwError, setRepeatPwError] = useState<string | null>(null);

  const passwordRef = useRef<HTMLInputElement>(null);
  const repeatPasswordRef = useRef<HTMLInputElement>(null);

  const handleClick = async () => {
    setPwError(null);
    setRepeatPwError(null);

    let error = false;

    if (!passwordRef.current?.value) {
      error = true;
      setPwError("Insere a tua password.");
    }

    if (!repeatPasswordRef.current?.value) {
      setRepeatPwError("Volta a inserir a tua password.");
      error = true;
    }

    if (error) return;

    const passwordRegex = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/);
    const password = passwordRef.current?.value as string;

    if (password.length < 8)
      return setPwError("A password deve conter pelo menos 8 caracteres.");
    if (!password.match(passwordRegex))
      return setPwError(
          "A password deve conter pelo menos 1 letra maiúscula, 1 letra minúscula e 1 número."
      );

    if (password !== repeatPasswordRef.current?.value)
      return setRepeatPwError("As passwords não coincidem.");

    setLoading(true);

    if (!code) {
      setLoading(false);
      setCodeError("Link inválido ou expirado. Pede novo email de recuperação.");
      return;
    }

    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password, code }),
      });

      if (!res.ok) {
        setLoading(false);
        const json = await res.json();
        return setPwError(json.error || "Algo correu mal");
      }

      swal(
          "Sucesso",
          "Password resetada com sucesso. Volta a iniciar sessão.",
          "success"
      );
      router.push("/login");
    } catch (e) {
      console.error(e);
      setLoading(false);
      setPwError("Erro de servidor");
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleClick();
  };

  return (
      <div className="relative max-h-[90vh] w-full overflow-hidden md:mt-4">
        <section className="flex max-h-[85vh] flex-col overflow-y-auto">
          <h1 className="mb-8 w-full text-center font-sans text-[24px] font-semibold text-white md:text-left md:text-[45px]">
            Reset Password
          </h1>

          {codeError && (
              <motion.p
                  className="mb-3 text-sm font-bold text-red-600"
                  animate={{ y: [-15, 0] }}
                  transition={{ ease: "easeOut", duration: 0.2 }}
              >
                {codeError}
              </motion.p>
          )}

          <div className="w-full">
            <Input
                name="Password"
                placeholder="Insere a tua password"
                type="password"
                inputRef={passwordRef}
                autoFocus={!!pwError}
                onKeyUp={handleKeyUp}
                className="!rounded-none !border-[rgba(255,255,255,0.35)] bg-transparent px-3 py-2 text-white placeholder:text-gray-500 sm:py-3"
            />
          </div>

          {pwError && (
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
                {pwError}
              </motion.p>
          )}

          <div className="mt-4 w-full">
            <Input
                name="Repete a Password"
                placeholder="Repete a tua password"
                type="password"
                inputRef={repeatPasswordRef}
                onKeyUp={handleKeyUp}
                className="!rounded-none !border-[rgba(255,255,255,0.35)] bg-transparent px-3 py-2 text-white placeholder:text-gray-500 sm:py-3"
            />
          </div>

          {repeatPwError && (
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
                {repeatPwError}
              </motion.p>
          )}

          <div className="mt-6 w-full">
            <PrimaryButton
                loading={loading}
                onClick={handleClick}
                className="!flex w-full cursor-pointer !items-center !justify-center !rounded-none !bg-[#B1440A] !px-3 py-3 !text-[17px] font-semibold !tracking-normal hover:!bg-[#8d3508] sm:py-4 sm:!text-[19px]"
            >
              CONFIRMAR
            </PrimaryButton>
          </div>
        </section>
      </div>
  );
};

const PasswordResetConfirmPage: React.FC = () => {
  return (
      <Suspense fallback={<div>Loading...</div>}>
        <PasswordResetForm />
      </Suspense>
  );
};

export default PasswordResetConfirmPage;

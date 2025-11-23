"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { logIn } from "@/lib/auth";
import useSession from "@/hooks/useSession";
import Input from "@/components/Input";
import PrimaryButton from "@/components/PrimaryButton";

const LoginPage: React.FC = () => {
  const session = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleClick = async () => {
    setEmailError(null);
    setPwError(null);

    let error = false;

    if (!emailRef.current?.value) {
      error = true;
      setEmailError("Insere o teu email.");
    }

    if (!passwordRef.current?.value) {
      error = true;
      setPwError("Insere a tua password.");
    }

    if (error) return;

    setLoading(true);

    const email = emailRef.current?.value as string;
    const password = passwordRef.current?.value as string;

    if (await logIn(email, password)) {
      session.fetchSession();
      router.push("/");
      return router.refresh();
    }

    setEmailError("Email ou password incorretos.");
    setPwError("Email ou password incorretos.");
    setLoading(false);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleClick();
  };

  return (
    <div className="relative w-full max-h-[90vh] overflow-hidden md:mt-4">
      <section className="flex max-h-[85vh] flex-col overflow-y-auto">
        <h1 className="mb-8 w-full text-center text-[24px] font-sans font-semibold text-white md:text-left md:text-[45px]">
          Iniciar Sessão
        </h1>

        <div className="w-full">
          <Input
            name="Email"
            inputRef={emailRef}
            autoFocus={!!emailError}
            onKeyUp={handleKeyUp}
            className="!rounded-none !border-[rgba(255,255,255,0.35)] bg-transparent px-3 py-2 text-white placeholder:text-gray-500 sm:py-3"
          />
        </div>

        {emailError && (
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
            {emailError}
          </motion.p>
        )}

        <span className="mt-3"></span>

        <div className="mt-4 w-full">
          <Input
            name="A tua palavra-passe"
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

        <div className="mt-2 w-full">
          <div className="mb-6 w-full text-right">
            <Link
              href="/password-reset"
              className="text-sm text-gray-400 underline"
            >
              Esqueci-me da palavra-passe
            </Link>
          </div>

          <PrimaryButton
            loading={loading}
            onClick={handleClick}
            className="w-full cursor-pointer !rounded-none !px-3 py-3 !text-[17px] font-semibold !tracking-normal sm:py-4 sm:!text-[19px] !bg-[#B1440A] hover:!bg-[#8d3508] !flex !items-center !justify-center"
          >
            Login
          </PrimaryButton>
        </div>
        <div className="mt-6 w-full">
          <div className="mb-3 text-center text-sm text-gray-400">
            Ainda não tens uma conta?
          </div>
          <PrimaryButton
            className="w-full cursor-pointer !rounded-none !px-3 py-3 !text-[17px] font-semibold !tracking-normal sm:py-4 sm:!text-[19px] !bg-[#B1440A] hover:!bg-[#8d3508] !flex !items-center !justify-center"
            onClick={() => router.push("/signup")}
          >
            Criar uma conta
          </PrimaryButton>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;

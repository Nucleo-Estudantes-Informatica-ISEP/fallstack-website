"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import swal from "sweetalert";

import { BASE_URL } from "@/services/api";
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
      const res = await fetch(BASE_URL + "/auth/password-reset-request", {
        method: "POST",
        body: JSON.stringify({ email: emailRef.current?.value }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Algo correu mal");
        setLoading(false);
        return;
      }

      // In development we may receive the token in the response
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

  return (
    <section className="flex w-full flex-col md:mt-12">
      <h2 className="mb-4 text-2xl font-semibold">Placeholder</h2>

      <Input name="Email" inputRef={emailRef} />

      {error && (
        <motion.p
          className="mt-1 text-sm font-bold text-red-600"
          animate={{ y: [-10, 0] }}
          transition={{ ease: "easeOut", duration: 0.2 }}
        >
          {error}
        </motion.p>
      )}

      <PrimaryButton loading={loading} onClick={handleClick} className="mt-6">
        Placeholder
      </PrimaryButton>
    </section>
  );
};

export default RequestResetPage;

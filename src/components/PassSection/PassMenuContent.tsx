"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Student, User } from "@prisma/client";

import { BASE_URL } from "@/services/api";
import StyledPassCard from "@/components/PassSection/StyledPassCard";
import { Clipboard } from "@/styles/Icons";

interface PassMenuContentProps {
  user: User & { student?: Student | null };
  code: string | null;
}

const PassMenuContent: React.FC<PassMenuContentProps> = ({ user, code }) => {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchToken = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(BASE_URL + "/qrcode", { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao obter QR code");
      const { data } = await res.json();
      setQrToken(data as string);
    } catch (e) {
      setQrToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const handleCopy = () => {
    if (!user.student?.code) return;
    navigator.clipboard.writeText(user.student.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRefresh = () => {
    fetchToken();
  };

  return (
    <div className="flex w-full flex-col items-center pt-4">
      <h2
        className="mb-6 text-center text-3xl font-bold text-white"
        style={{ fontFamily: "Coolvetica, sans-serif" }}
      >
        Passe do FallStack
      </h2>
      <p className="mb-8 max-w-xl text-center text-sm text-gray-200">
        Apresenta este passe às empresas para que possam guardar o teu perfil e
        contabilizar as tuas interações.
      </p>
      {/* New styled card design */}
      <StyledPassCard
        name={user.student?.name}
        qrValue={qrToken}
        loading={loading}
        code={user.student?.code}
      />
      {code && (
        <button
          onClick={handleCopy}
          className="mt-5 flex items-center gap-2 rounded-md border border-[#2A2A2A] bg-[#1E1E1E] px-3 py-2 text-sm text-white transition hover:border-[#ED8326] hover:text-[#ED8326]"
        >
          <Clipboard className="h-4 w-4" />
          <span className="font-mono">{code}</span>
          {copied && <span className="ml-1 text-green-400">Copiado!</span>}
        </button>
      )}
      {/* Keep old card below (optional) - can remove later */}
      {/* <div className="mt-10"><QRCodeCard name={user.name} subtitle={user.email} qrValue={qrToken} code={user.student?.code ?? undefined} loading={loading} onCopy={handleCopy} isCopied={copied} onRefresh={handleRefresh} /></div> */}
    </div>
  );
};

export default PassMenuContent;

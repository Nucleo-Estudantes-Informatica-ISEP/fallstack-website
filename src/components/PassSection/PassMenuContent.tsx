"use client";

import React, { useCallback, useEffect, useState } from "react";

import { httpClient } from "@/lib/http/client";
import { Clipboard } from "@/components/ui/Icons";
import StyledPassCard from "@/components/PassSection/StyledPassCard";
import type { StudentDto } from "@/application/dto/studentDto";

interface PassMenuContentProps {
  student: Pick<StudentDto, "code" | "name">;
}

const PassMenuContent: React.FC<PassMenuContentProps> = ({ student }) => {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchToken = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await httpClient.get<{ data: string }>("/qrcode", {
        cache: "no-store",
      });
      setQrToken(data);
    } catch {
      setQrToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const handleCopy = () => {
    navigator.clipboard.writeText(student.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
        name={student.name}
        qrValue={qrToken}
        loading={loading}
        code={student.code}
      />
      {student.code && (
        <button
          onClick={handleCopy}
          className="mt-5 flex items-center gap-2 rounded-md border border-[#2A2A2A] bg-[#1E1E1E] px-3 py-2 text-sm text-white transition hover:border-[#ED8326] hover:text-[#ED8326]"
        >
          <Clipboard className="h-4 w-4" />
          <span className="font-mono">{student.code}</span>
          {copied && <span className="ml-1 text-green-400">Copiado!</span>}
        </button>
      )}
      {/* Keep old card below (optional) - can remove later */}
      {/* <div className="mt-10"><QRCodeCard name={user.name} subtitle={user.email} qrValue={qrToken} code={user.student?.code ?? undefined} loading={loading} onCopy={handleCopy} isCopied={copied} onRefresh={handleRefresh} /></div> */}
    </div>
  );
};

export default PassMenuContent;

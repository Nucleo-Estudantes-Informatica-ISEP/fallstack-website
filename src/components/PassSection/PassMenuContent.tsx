"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FiDownload } from "react-icons/fi";

import { httpClient } from "@/lib/http/client";
import { Clipboard } from "@/components/ui/Icons";
import { downloadOfflinePass } from "@/components/PassSection/generateOfflinePass";
import StyledPassCard from "@/components/PassSection/StyledPassCard";
import type { StudentDto } from "@/application/dto/studentDto";

interface PassMenuContentProps {
  student: Pick<StudentDto, "code" | "name"> & {
    user?: { email?: string };
  };
  googleWalletSaveUrl?: string | null;
}

const PassMenuContent: React.FC<PassMenuContentProps> = ({
  student,
  googleWalletSaveUrl,
}) => {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  // Ref para o QR Code SVG permanente (student.code), nunca o qrToken rotativo
  const permanentQrRef = useRef<SVGSVGElement | null>(null);

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

  const handleDownloadOfflinePass = async () => {
    if (!student.code || !permanentQrRef.current) return;
    try {
      setDownloading(true);
      await downloadOfflinePass({
        studentName: student.name,
        studentEmail: student.user?.email,
        permanentCode: student.code,
        qrSvgElement: permanentQrRef.current,
      });
    } finally {
      setDownloading(false);
    }
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
        contabilizar as tuas interações. Podes descarregar uma cópia para usar
        sem acesso à internet.
      </p>

      {/* Cartão visual (mostra o token dinâmico online) */}
      <StyledPassCard
        name={student.name}
        qrValue={qrToken}
        loading={loading}
        code={student.code}
      />

      {/* QR Code permanente oculto (exclusivamente para gerar o ficheiro offline) */}
      {student.code && (
        <div className="hidden" aria-hidden="true">
          <QRCodeSVG
            ref={permanentQrRef}
            value={student.code}
            size={400}
            bgColor="#FFFFFF"
            fgColor="#000000"
            level="M"
          />
        </div>
      )}

      {/* Código de fallback legível e copiável */}
      {student.code && (
        <button
          type="button"
          onClick={handleCopy}
          className="mt-5 flex items-center gap-2 rounded-md border border-secondary bg-[#1E1E1E] px-4 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
        >
          <Clipboard className="size-4" />
          <span className="font-mono tracking-wider">{student.code}</span>
          {copied && <span className="ml-1 text-green-400">Copiado!</span>}
        </button>
      )}

      {/* Ações: Download Offline + Google Wallet */}
      <div className="mt-6 flex w-full max-w-md flex-col items-center justify-center gap-3 sm:flex-row">
        {student.code && (
          <button
            type="button"
            onClick={handleDownloadOfflinePass}
            disabled={downloading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#ea580c] disabled:opacity-50 sm:w-auto"
          >
            <FiDownload className="size-4" />
            {downloading ? "A gerar passe..." : "Descarregar Passe (Offline)"}
          </button>
        )}

        {googleWalletSaveUrl && (
          <a
            href={googleWalletSaveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center"
          >
            <img
              src="/google-wallet/add-to-google-wallet-pt.svg"
              alt="Adicionar à Carteira do Google"
              className="h-12 w-auto"
            />
          </a>
        )}
      </div>
    </div>
  );
};

export default PassMenuContent;

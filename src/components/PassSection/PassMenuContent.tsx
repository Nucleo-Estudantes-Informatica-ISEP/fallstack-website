"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FiDownload } from "react-icons/fi";

import { httpClient } from "@/lib/http/client";
import { Clipboard } from "@/components/ui/Icons";
import GoogleWalletButton from "@/components/GoogleWalletButton";
import { downloadOfflinePass } from "@/components/PassSection/generateOfflinePass";
import StyledPassCard from "@/components/PassSection/StyledPassCard";
import type { StudentDto } from "@/application/dto/studentDto";

interface PassMenuContentProps {
  student: Pick<StudentDto, "code" | "name"> & {
    user?: { email?: string };
  };
  googleWalletSaveUrl?: string | null;
}

const DOWNLOAD_ERROR_MESSAGE =
  "Não foi possível gerar o passe offline. Tenta novamente antes de ficares sem internet.";

const PassMenuContent: React.FC<PassMenuContentProps> = ({ student }) => {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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
    setDownloadError(null);

    if (!student.code || !permanentQrRef.current) {
      setDownloadError(DOWNLOAD_ERROR_MESSAGE);
      return;
    }

    try {
      setDownloading(true);
      await downloadOfflinePass({
        studentName: student.name,
        studentEmail: student.user?.email,
        permanentCode: student.code,
        qrSvgElement: permanentQrRef.current,
      });
    } catch {
      // O botão volta a ficar ativo no finally, por isso o retry é o próprio botão.
      setDownloadError(DOWNLOAD_ERROR_MESSAGE);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex w-full flex-col">
      <h2 className="text-2xl font-semibold text-white">Passe do FallStack</h2>
      <p className="mt-4 mb-8 text-base text-white">
        Apresenta este passe às empresas para que possam guardar o teu perfil e
        contabilizar as tuas interações. Podes descarregar uma cópia para usar
        sem acesso à internet.
      </p>

      <div className="flex flex-col items-center gap-8 md:flex-row md:items-stretch">
        {/* Cartão visual (mostra o token dinâmico online) */}
        <StyledPassCard
          name={student.name}
          qrValue={qrToken}
          loading={loading}
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

        <div className="flex w-full min-w-0 flex-col items-center gap-6 md:items-start md:justify-between">
          {/* Código de fallback legível e copiável */}
          {student.code && (
            <div className="flex flex-col items-center md:items-start">
              <p className="text-xs text-ui-muted">O teu passe tem o código:</p>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={`Copiar código ${student.code}`}
                className="mt-1 flex items-center gap-2 rounded-md py-1 text-3xl font-semibold tracking-wider text-white transition hover:text-ui-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-focus"
              >
                <span>{student.code}</span>
                <Clipboard className="size-5" />
              </button>
              <p role="status" className="h-5 text-sm text-ui-success">
                {copied ? "Copiado!" : ""}
              </p>
            </div>
          )}

          {/* Ações: Download Offline + Google Wallet */}
          <div className="flex flex-col items-center gap-3 sm:flex-row md:items-end">
            {student.code && (
              <button
                type="button"
                onClick={handleDownloadOfflinePass}
                disabled={downloading}
                className="ui-action h-12 px-5 text-sm font-semibold"
              >
                <FiDownload className="size-4" />
                {downloading
                  ? "A gerar passe..."
                  : "Descarregar Passe (Offline)"}
              </button>
            )}

            <GoogleWalletButton />
          </div>
        </div>
      </div>

      {/* Erro na geração do passe offline */}
      {downloadError && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {downloadError}
        </p>
      )}
    </div>
  );
};

export default PassMenuContent;

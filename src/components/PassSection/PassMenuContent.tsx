"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FiDownload } from "react-icons/fi";

import { httpClient } from "@/lib/http/client";
import { Clipboard } from "@/components/ui/Icons";
import GoogleWalletButton from "@/components/GoogleWalletButton";
import {
  downloadOfflinePass,
  generateOfflinePass,
} from "@/components/PassSection/generateOfflinePass";
import StyledPassCard from "@/components/PassSection/StyledPassCard";
import type { StudentDto } from "@/application/dto/studentDto";

interface PassMenuContentProps {
  student: Pick<StudentDto, "code" | "name"> & { user?: { email?: string } };
}

const DOWNLOAD_ERROR_MESSAGE =
  "Não foi possível gerar o passe offline. Tenta novamente antes de ficares sem internet.";

const PassMenuContent: React.FC<PassMenuContentProps> = ({ student }) => {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [preparedPass, setPreparedPass] = useState<File | null>(null);
  const permanentQrRef = useRef<SVGSVGElement | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1500);
    try {
      const result = navigator.clipboard.writeText(student.code);
      if (result && typeof result.then === "function") {
        result.catch(() => setCopied(false));
      }
    } catch {
      setCopied(false);
    }
  };

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  useEffect(() => {
    setPreparedPass(null);
  }, [student.name, student.code, student.user?.email]);

  const handleDownloadOfflinePass = async () => {
    setDownloadError(null);
    if (!student.code || !permanentQrRef.current) {
      setDownloadError(DOWNLOAD_ERROR_MESSAGE);
      return;
    }
    try {
      setDownloading(true);
      if (preparedPass) {
        // Sharing needs a fresh user gesture, after asynchronous PNG generation.
        await navigator.share({ files: [preparedPass] });
        return;
      }
      const file = await generateOfflinePass({
        studentName: student.name,
        studentEmail: student.user?.email,
        permanentCode: student.code,
        qrSvgElement: permanentQrRef.current,
      });
      if (
        typeof navigator.share === "function" &&
        navigator.canShare?.({ files: [file] })
      ) {
        setPreparedPass(file);
      } else {
        downloadOfflinePass(file);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setDownloadError(DOWNLOAD_ERROR_MESSAGE);
    } finally {
      setDownloading(false);
    }
  };

  const failed = !loading && !qrToken;
  const secondaryButton =
    "ui-focus inline-flex min-h-11 items-center gap-2 rounded-md border border-ui-border px-4 text-sm text-white transition-colors hover:border-ui-highlight hover:text-ui-highlight";

  return (
    <section className="flex w-full flex-col">
      <h2 className="mb-5 text-center font-sans text-2xl font-semibold text-white lg:text-left lg:text-[1.75rem]">
        Passe do FallStack
      </h2>
      <p className="mb-8 text-center text-sm text-white md:text-base lg:text-left">
        Passa o teu passe na entrada para as palestras, junto a um elemento do
        staff para ficares registado para os vários giveaways que o NEI irá
        fazer!
      </p>
      <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start">
        <div className="flex w-full max-w-87 shrink-0 flex-col items-center gap-3">
          <StyledPassCard
            name={student.name}
            qrValue={qrToken}
            loading={loading}
            code={student.code}
          />
          {failed && (
            <>
              <p className="text-center text-sm text-white">
                Não foi possível carregar o QR Code.
              </p>
              <button
                type="button"
                onClick={fetchToken}
                className={secondaryButton}
              >
                Tentar novamente
              </button>
            </>
          )}
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
        </div>
        <div className="flex w-full min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
          {student.code && (
            <>
              <p className="text-sm text-ui-muted md:text-base">
                O teu passe tem o código:
              </p>
              <div className="mt-2 flex max-w-full flex-wrap items-center justify-center gap-3 lg:justify-start">
                <p className="min-w-0 font-mono text-3xl font-bold tracking-wider wrap-anywhere text-white">
                  {student.code}
                </p>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label={`Copiar o código ${student.code}`}
                  className={secondaryButton}
                >
                  <Clipboard className="size-4" aria-hidden="true" />
                  <span>Copiar</span>
                </button>
              </div>
              <p
                role="status"
                className="mt-1 min-h-5 text-sm text-ui-highlight"
              >
                {copied ? "Copiado!" : ""}
              </p>
            </>
          )}
          <div className="mt-4 flex flex-col items-center gap-2 lg:items-start">
            {student.code && (
              <button
                type="button"
                onClick={handleDownloadOfflinePass}
                disabled={downloading}
                className="ui-focus inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                <FiDownload className="size-4" aria-hidden="true" />
                {downloading
                  ? "A gerar passe..."
                  : preparedPass
                    ? "Guardar Passe (Offline)"
                    : "Descarregar Passe (Offline)"}
              </button>
            )}
            {preparedPass && (
              <p role="status" className="text-sm text-ui-muted">
                Passe pronto. Toca em Guardar Passe e escolhe Guardar imagem ou
                Guardar em Ficheiros.
              </p>
            )}
            <GoogleWalletButton />
          </div>
          {downloadError && (
            <p role="alert" className="mt-3 text-sm text-red-400">
              {downloadError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default PassMenuContent;

"use client";

import React, { useCallback, useEffect, useState } from "react";

import { httpClient } from "@/lib/http/client";
import { Clipboard } from "@/components/ui/Icons";
import GoogleWalletButton from "@/components/GoogleWalletButton";
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

  const failed = !loading && !qrToken;
  const secondaryButton =
    "ui-focus inline-flex min-h-11 items-center gap-2 rounded-md border border-ui-border px-4 text-sm text-white transition-colors hover:border-ui-highlight hover:text-ui-highlight";

  return (
    <section className="flex w-full flex-col">
      <h2 className="mb-5 text-center font-sans text-2xl text-white lg:text-left lg:text-[1.75rem]">
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
          {/* Wallet actions; #406 adds the pass download here. */}
          <div className="mt-4 flex flex-col items-center gap-2 lg:items-start">
            <GoogleWalletButton />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PassMenuContent;

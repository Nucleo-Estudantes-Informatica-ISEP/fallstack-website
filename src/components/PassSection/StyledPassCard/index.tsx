"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import Modal from "@/components/ui/Modal";
import { branding } from "@/edition/branding";

interface StyledPassCardProps {
  name: string;
  qrValue: string | null;
  hashtag?: string;
  loading?: boolean;
  showRightName?: boolean;
  enlargeOnClick?: boolean;
  code?: string;
}

const StyledPassCard: React.FC<StyledPassCardProps> = ({
  name,
  qrValue,
  hashtag = branding.hashtag,
  loading = false,
  showRightName = true,
  enlargeOnClick = true,
  code,
}) => {
  const [isEnlarged, setIsEnlarged] = useState(false);
  return (
    <div className="flex w-full max-w-87 flex-col items-center gap-4 rounded-2xl bg-linear-to-br from-[#0D2800] via-[#1F6000] to-[#005F56] p-5 text-white">
      <div className="w-full min-w-0 text-center">
        <h3 className="text-lg font-semibold wrap-anywhere">{name}</h3>
        {code && (
          <p
            className="mt-2 font-mono text-2xl font-bold"
            aria-label="Código do participante"
          >
            {code}
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={!enlargeOnClick || loading || !qrValue}
        aria-label="Ver QR code em tamanho grande"
        onClick={() => setIsEnlarged(true)}
        className="flex aspect-square w-full max-w-[217px] items-center justify-center rounded-lg bg-white p-2 text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-default"
      >
        {loading ? (
          <span
            role="status"
            aria-label="A carregar QR"
            className="size-24 animate-spin rounded-full border-4 border-green-700 border-r-transparent"
          />
        ) : qrValue ? (
          <QRCodeSVG className="h-auto w-full" value={qrValue} size={209} />
        ) : (
          <span>Sem QR</span>
        )}
      </button>
      {showRightName && (
        <p className="max-w-full text-center text-sm wrap-anywhere">{name}</p>
      )}
      <p className="text-sm text-white">{hashtag}</p>
      <Modal
        aria-label="QR Code ampliado"
        className="max-w-sm bg-background! text-white!"
        isVisible={isEnlarged && !!qrValue}
        setIsVisible={setIsEnlarged}
      >
        <div className="flex w-full max-w-sm flex-col items-center gap-4 p-4">
          <button
            type="button"
            onClick={() => setIsEnlarged(false)}
            className="min-h-11 rounded border px-4 text-white focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Fechar QR grande"
          >
            Fechar
          </button>
          {qrValue && (
            <div className="w-full rounded-xl bg-white p-4">
              <QRCodeSVG className="h-auto w-full" value={qrValue} size={300} />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
export default StyledPassCard;

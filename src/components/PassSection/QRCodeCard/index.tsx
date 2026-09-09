"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { FiClipboard, FiRefreshCw } from "react-icons/fi";

interface QRCodeCardProps {
  name: string;
  subtitle?: string;
  qrValue: string | null;
  code?: string;
  loading?: boolean;
  onCopy?: () => void;
  isCopied?: boolean;
  onRefresh?: () => void;
}

const QRCodeCard: React.FC<QRCodeCardProps> = ({
  name,
  subtitle,
  qrValue,
  code,
  loading = false,
  onCopy,
  isCopied,
  onRefresh,
}) => {
  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#121212] shadow-xl">
      <div className="bg-gradient-to-br from-[#ED8326] to-[#FFB347] p-6 text-white">
        <h3
          className="text-2xl leading-tight font-bold"
          style={{ fontFamily: "Coolvetica, sans-serif" }}
        >
          {name}
        </h3>
        {subtitle && (
          <p
            className="mt-1 text-sm opacity-95"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex flex-col items-center px-6 pt-6 pb-8">
        <div className="rounded-xl bg-white p-4 shadow-lg">
          {loading ? (
            <div className="inline-block size-40 animate-spin rounded-full border-4 border-solid border-[#ED8326] border-r-transparent" />
          ) : qrValue ? (
            <QRCodeSVG value={qrValue} size={180} />
          ) : (
            <div className="flex size-44 items-center justify-center text-xs text-gray-500">
              Sem QR Code
            </div>
          )}
        </div>
        {code && (
          <button
            onClick={onCopy}
            className="mt-5 flex items-center gap-2 rounded-md border border-[#2A2A2A] bg-[#1E1E1E] px-3 py-2 text-sm text-white transition hover:border-[#ED8326] hover:text-[#ED8326]"
          >
            <FiClipboard className="size-4" />
            <span className="font-mono">{code}</span>
            {isCopied && <span className="ml-1 text-green-400">Copiado!</span>}
          </button>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-4 flex items-center gap-2 rounded-md bg-[#ED8326] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <FiRefreshCw className="size-4" />
            Atualizar QR Code
          </button>
        )}
        <p className="mt-6 w-full text-center text-xs text-gray-400">
          Mostra este passe às empresas para que possam guardar o teu perfil.
        </p>
      </div>
    </div>
  );
};

export default QRCodeCard;

"use client";

import React, { useCallback, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface StyledPassCardProps {
  name: string;
  qrValue: string | null;
  hashtag?: string; // e.g. "#fallstack2025"
  loading?: boolean;
  showRightName?: boolean; // new optional prop
  enlargeOnClick?: boolean; // enables click to enlarge QR
  code?: string; // NEW: student code to display if camera fails
}

/**
 * StyledPassCard implements the design spec provided with fixed dimensions (348x212).
 * Notes:
 * - Uses inline styles for non-standard gradient angles and precise pixel positioning.
 * - Backdrop filter depends on browser support; gracefully degrades (still semi-transparent) if unsupported.
 * - Noise layer simulated using a CSS radial gradient pattern instead of external PNG.
 */
const StyledPassCard: React.FC<StyledPassCardProps> = ({
  name,
  qrValue,
  hashtag = "#fallstack2025",
  loading = false,
  showRightName = true,
  enlargeOnClick = true,
  code,
}) => {
  const [isEnlarged, setIsEnlarged] = useState(false);

  const handleQrClick = () => {
    if (!enlargeOnClick || loading || !qrValue) return;
    setIsEnlarged(true);
  };
  const closeEnlarged = useCallback(() => setIsEnlarged(false), []);
  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if ((e.key === "Enter" || e.key === " ") && !isEnlarged) {
      e.preventDefault();
      handleQrClick();
    }
    if (e.key === "Escape" && isEnlarged) {
      closeEnlarged();
    }
  };

  return (
    <div
      className="relative select-none"
      style={{
        width: 348,
        height: 299,
        borderRadius: 16,
        boxSizing: "border-box",
        background:
          "linear-gradient(110.36deg, #0D2800 0%, #2F8E00 58.65%, #005F56 100%)",
        overflow: "hidden",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Blurred shape */}
      <div
        className="absolute"
        style={{
          width: 468.65,
          height: 127.4,
          left: -64.84,
          top: 138.96,
          background: "linear-gradient(180deg, #575F4E 33.87%, #C3EFCA 65.6%)",
          filter: "blur(36px)",
          pointerEvents: "none",
        }}
      />
      {/* Noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />
      {/* Right translucent rectangle */}
      <div
        className="absolute top-0 h-full"
        style={{
          left: 110,
          width: 238,
          background: "rgba(217,217,217,0.31)",
          backdropFilter: "blur(10px)",
        }}
      />
      {/* Text content */}
      <div className="absolute" style={{ left: 20, top: 20, width: 150 }}>
        <h3
          className="m-0 p-0"
          style={{
            fontWeight: 600,
            fontSize: 19,
            lineHeight: "23px",
            letterSpacing: "-0.04em",
            color: "#FFFFFF",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </h3>
        {code && (
          <p
            style={{
              marginTop: 8,
              fontWeight: 700,
              fontSize: 24,
              lineHeight: "26px",
              letterSpacing: "-0.04em",
              color: "#FFFFFF",
              width: 150,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontFamily: "Coolvetica, Inter, sans-serif",
            }}
            title={code}
            aria-label="Código do participante"
          >
            {code}
          </p>
        )}
      </div>
      {/* QR Code area */}
      <div
        className="absolute flex items-center justify-center"
        style={{ left: 120, top: 20, width: 217, height: 217 }}
      >
        <div
          className="flex cursor-pointer items-center justify-center"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 10,
            background: "#FFFFFF",
            padding: 4,
          }}
          role={enlargeOnClick ? "button" : undefined}
          tabIndex={enlargeOnClick ? 0 : -1}
          aria-label={
            enlargeOnClick ? "Ver QR code em tamanho grande" : undefined
          }
          onClick={handleQrClick}
          onKeyDown={handleKeyDown}
        >
          {loading ? (
            <div className="inline-block h-[122px] w-[122px] animate-spin rounded-full border-4 border-solid border-[#2F8E00] border-r-transparent" />
          ) : qrValue ? (
            <QRCodeSVG value={qrValue} size={209} />
          ) : (
            <div className="flex h-[122px] w-[122px] items-center justify-center text-[10px] text-gray-500">
              Sem QR
            </div>
          )}
        </div>
      </div>
      {/* Right side name below QR (optional) */}
      {showRightName && (
        <div
          className="absolute"
          style={{
            left: 207,
            top: 154,
            width: 130,
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
            fontSize: 12,
            lineHeight: "14px",
            letterSpacing: "-0.03em",
            color: "rgba(255,255,255,0.75)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={name}
        >
          {name}
        </div>
      )}
      {/* Hashtag */}
      <div
        className="absolute flex items-end justify-end"
        style={{
          left: 207,
          top: 258,
          width: 130,
          height: 21,
          fontWeight: 400,
          fontSize: 17,
          lineHeight: "21px",
          letterSpacing: "-0.04em",
          color: "rgba(255,255,255,0.19)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {hashtag}
      </div>
      {/* Enlarged overlay */}
      {isEnlarged && qrValue && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="QR Code ampliado"
          onClick={closeEnlarged}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeEnlarged}
              className="absolute -top-10 right-0 rounded bg-white/10 px-3 py-1 text-sm font-medium text-white transition hover:bg-white/20"
              aria-label="Fechar QR grande"
            >
              Fechar
            </button>
            <div className="w-screen max-w-screen rounded-xl bg-white p-6 shadow-2xl">
              <QRCodeSVG className="size-full" value={qrValue} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StyledPassCard;

"use client";

import React, { useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useZxing } from "react-zxing";

type DecodedQrResult = { getText(): string };

interface QRCodeScannerProps {
  handleScan: (data: string) => void | Promise<void>;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ handleScan }) => {
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const handlingResult = useRef(false);

  const { ref } = useZxing({
    constraints: { video: { facingMode: { ideal: "environment" } } },
    timeBetweenDecodingAttempts: 250,
    onDecodeResult: useCallback(
      async (result: DecodedQrResult) => {
        if (handlingResult.current) return;
        const decodedText = result.getText();

        if (!decodedText) {
          toast.error(
            "Ocorreu um erro a obter o perfil do estudante a partir do QR Code..."
          );
          return;
        }

        handlingResult.current = true;
        try {
          await handleScan(decodedText);
        } finally {
          handlingResult.current = false;
        }
      },
      [handleScan]
    ),
    onError: useCallback(() => {
      setCameraError(
        "NÃ£o foi possÃ­vel aceder Ã  cÃ¢mara. Confirma permissÃ£o e tenta novamente."
      );
      setLoading(false);
    }, []),
  });

  return (
    <div className="flex items-center">
      {loading && (
        <div className="absolute top-0 left-0 flex size-full items-center justify-center bg-black/50">
          <div className="flex flex-col items-center">
            <div className="size-12 animate-spin rounded-full border-y-2 border-r-2 border-blue-500"></div>
            <p className="mt-2 text-white">A ligar a tua câmara...</p>
          </div>
        </div>
      )}
      {cameraError ? (
        <p className="p-4 text-center text-red-600" role="alert">
          {cameraError}
        </p>
      ) : (
        <video
          ref={ref as React.RefObject<HTMLVideoElement>}
          className="rounded-lg"
          onCanPlay={() => setLoading(false)}
          playsInline
          style={{ visibility: loading ? "hidden" : "visible" }}
        />
      )}
    </div>
  );
};

export default QRCodeScanner;

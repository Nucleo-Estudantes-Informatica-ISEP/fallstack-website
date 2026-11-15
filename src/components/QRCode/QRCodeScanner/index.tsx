"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useZxing } from "react-zxing";

type DecodedQrResult = { getText(): string };

interface QRCodeScannerProps {
  handleScan: (data: string) => void | Promise<void>;
  // Shows the scanner's own errors in the page instead of as toasts, so a
  // caller can keep them off the camera. Without it they are toasts.
  onMessage?: (message: string) => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  handleScan,
  onMessage,
}) => {
  const [loading, setLoading] = useState(true);
  const handlingResult = useRef(false);
  const reportedCameraError = useRef(false);
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const report = useCallback((message: string) => {
    if (onMessageRef.current) onMessageRef.current(message);
    else toast.error(message);
  }, []);

  const { ref } = useZxing({
    constraints: { video: { facingMode: { ideal: "environment" } } },
    timeBetweenDecodingAttempts: 250,
    onDecodeResult: useCallback(
      async (result: DecodedQrResult) => {
        if (handlingResult.current) return;
        const decodedText = result.getText();

        if (!decodedText) {
          report(
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
      [handleScan, report]
    ),
    onError: useCallback(() => {
      setLoading(false);
      if (reportedCameraError.current) return;

      // Some mobile browsers report a camera setup error even while the video
      // stream continues to work. Keep the scanner available in that case.
      reportedCameraError.current = true;
      report(
        "Não foi possível aceder à câmara. Confirma permissão e tenta novamente."
      );
    }, [report]),
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
      <video
        ref={ref as React.RefObject<HTMLVideoElement>}
        className="rounded-lg"
        onCanPlay={() => setLoading(false)}
        playsInline
        style={{ visibility: loading ? "hidden" : "visible" }}
      />
    </div>
  );
};

export default QRCodeScanner;

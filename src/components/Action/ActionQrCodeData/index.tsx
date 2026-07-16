"use client";

import { useEffect, useState } from "react";
import useWindowSize from "@rooks/use-window-size";
import { QRCodeSVG } from "qrcode.react";

import config from "@/config";
import { httpClient } from "@/lib/http/client";

interface ActionQrCodeDataProps {
  id: string;
  initialQrCode: string;
}

const ActionQrCodeData: React.FC<ActionQrCodeDataProps> = ({
  id,
  initialQrCode,
}) => {
  const [qrCodeData, setQrCodeData] = useState(initialQrCode);
  const { innerWidth } = useWindowSize();

  useEffect(() => {
    const fetchQrCodeData = async () => {
      const { qrCode } = await httpClient.get<{ qrCode: string }>(
        `/actions/${id}`
      );
      setQrCodeData(qrCode);
    };

    const interval = setInterval(
      fetchQrCodeData,
      config.constants.actionQrCodeRefreshRateMs
    );

    return () => clearInterval(interval);
  }, [id]);

  return (
    <div className="bg-white p-16">
      {qrCodeData && (
        <QRCodeSVG
          size={innerWidth ? Math.min(innerWidth / 2, 520) : 320}
          value={qrCodeData}
        />
      )}
    </div>
  );
};

export default ActionQrCodeData;

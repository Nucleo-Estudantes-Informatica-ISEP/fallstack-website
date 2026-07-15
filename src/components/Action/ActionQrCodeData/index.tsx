"use client";

import { useEffect, useState } from "react";
import useWindowSize from "@rooks/use-window-size";
import { QRCodeSVG } from "qrcode.react";

import config from "@/config";
import { BASE_URL } from "@/services/api";

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
      const res = await fetch(BASE_URL + `/actions/${id}`);
      const { qrCode } = await res.json();
      setQrCodeData(qrCode as string);
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

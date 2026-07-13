"use client";

import React, { useState } from "react";

import QRCodeModal from "@/components/QRCode/QRCodeModal";
import type { SessionDto } from "@/application/dto/sessionDto";

import { BsQrCodeScan } from "react-icons/bs";

interface QRCodeButtonProps {
  user: SessionDto;
}

const QRCodeButton: React.FC<QRCodeButtonProps> = ({ user }) => {
  const [isHidden, setIsHidden] = useState(true);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsHidden(false)}
        aria-label="Ver QR code"
        className="flex size-6 items-center justify-center fill-white p-0.5 text-2xl transition-colors hover:text-primary"
      >
        <BsQrCodeScan size={20} />
      </button>

      <QRCodeModal setHidden={setIsHidden} hidden={isHidden} user={user} />
    </>
  );
};

export default QRCodeButton;

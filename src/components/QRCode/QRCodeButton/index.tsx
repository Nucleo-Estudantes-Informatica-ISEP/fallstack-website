"use client";

import React, { useState } from "react";

import { UserWithProfile } from "@/types/UserWithProfile";
import QRCodeModal from "@/components/QRCode/QRCodeModal";

import { BsQrCodeScan } from "react-icons/bs";

interface QRCodeButtonProps {
  user: UserWithProfile;
}

const QRCodeButton: React.FC<QRCodeButtonProps> = ({ user }) => {
  const [isHidden, setIsHidden] = useState(true);

  return (
    <>
      <button className="flex size-6 items-center justify-center fill-white p-0.5 text-2xl transition-colors hover:text-primary">
        <BsQrCodeScan onClick={() => setIsHidden(false)} size={20} />
      </button>

      <QRCodeModal setHidden={setIsHidden} hidden={isHidden} user={user} />
    </>
  );
};

export default QRCodeButton;

"use client";

import React, { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

import { httpClient } from "@/lib/http/client";
import type { SessionDto } from "@/application/dto/sessionDto";

import { BsFillClipboardFill } from "react-icons/bs";

interface PerfilTabProps {
  user: SessionDto;
}

const ProfileTab: React.FC<PerfilTabProps> = ({ user }) => {
  const [qrcode, setQrcode] = useState<string | null>(null);

  const controls = useAnimation();
  const [isCopied, setIsCopied] = React.useState<boolean>(false);

  const handleCopyClick = () => {
    if (user.student?.code) {
      navigator.clipboard.writeText(user.student?.code).catch(() => {});

      // start animation when code is copied
      controls.start({
        scale: [1, 1.1, 1], // Example animation (scale up and down)
      });

      // show "Copied!" text
      setIsCopied(true);

      // reset the "Copied!" text after a short delay
      setTimeout(() => {
        setIsCopied(false);
      }, 1500);
    }
  };

  const fetchQrcode = async () => {
    const { data } = await httpClient.get<{ data: string }>("/qrcode");
    setQrcode(data);
  };

  useEffect(() => {
    fetchQrcode();
  });

  return (
    <div className="mt-10 grid grid-cols-1 sm:mt-0 sm:grid-cols-1 md:mt-6 md:grid-cols-2 lg:mt-20">
      {/* left column */}
      <div className="flex items-center justify-center">
        {qrcode && <QRCodeSVG size={150} value={qrcode} />}
      </div>
      {/* right column */}
      <div className="flex items-center justify-center pt-14 pb-0 sm:py-0">
        <div className="relative flex flex-col items-center">
          <motion.div
            className="rounded-lg bg-gray-200 p-2 sm:p-2 md:p-2"
            onClick={handleCopyClick}
            whileTap={{ scale: 0.9 }} // Optional: Add a tap effect
            animate={controls}
            initial={{ scale: 1 }}
            style={{ userSelect: "none" }} // Disable text selection
          >
            <div className="flex items-center">
              <motion.div className="w-56 cursor-pointer border-none bg-gray-200 p-2 text-center text-xl font-bold text-black focus:outline-none sm:w-56 sm:text-3xl md:w-72">
                {user.student?.code}
              </motion.div>
              <motion.div whileTap={{ scale: 0.9 }}>
                <BsFillClipboardFill
                  style={{
                    fontSize: "1.5rem",
                    color: "#718096",
                  }}
                  className="cursor-pointer"
                />
              </motion.div>
            </div>
          </motion.div>
          {isCopied && (
            <p className="mt-2 font-bold text-green-500">Copiado!</p>
          )}
          <p className="mt-6 text-sm text-black sm:mr-6 md:mr-4 md:text-sm lg:mr-0 lg:text-base">
            Partilha o teu <b>código</b> com as empresas de forma a poderem{" "}
            <b>guardar</b> o teu perfil!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;

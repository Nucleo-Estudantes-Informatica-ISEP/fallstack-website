"use client";

import React from "react";

import { UserWithProfile } from "@/types/UserWithProfile";
import { useDisableBodyScroll } from "@/hooks/disableBackgroundMoving";
import useIsMobile from "@/hooks/useIsMobile";
import QRCodeTab from "@/components/QRCode/QRCodeTab";
import CompanyTab from "@/components/QRCode/QRCodeTab/CompanyTab";
import ProfileTab from "@/components/QRCode/QRCodeTab/ProfileTab";
import ScanTab from "@/components/QRCode/QRCodeTab/ScanTab";

import { BsX } from "react-icons/bs";

interface QRCodeModalProps {
  hidden: boolean;
  setHidden: React.Dispatch<React.SetStateAction<boolean>>;
  user: UserWithProfile;
}
const QRCodeModal: React.FC<QRCodeModalProps> = ({
  hidden,
  setHidden,
  user,
}) => {
  // disable body scroll
  useDisableBodyScroll({ modalIsHidden: hidden });

  const tabTitles = ["Perfil", "Scan"];
  const tabs = [
    <ProfileTab key={""} user={user} />,
    <ScanTab key={""} setHidden={setHidden} />,
  ];
  const modalTitle = [
    <>
      Partilha o teu <span className="text-primary">QRCODE</span>
    </>,
    <>
      Dá <span className="text-primary">scan</span> a um QRCODE
    </>,
    <>
      Introduza o <span className="text-primary">código</span> do estudante
    </>,
  ];

  const [titleIndex, setTitleIndex] = React.useState<number>(0);

  const isMobile = useIsMobile();

  return !hidden ? (
    <div
      className="animate-fade-imm fixed inset-6 start-4 end-4 z-40 overflow-y-hidden rounded-lg transition-opacity sm:inset-4 sm:start-6 sm:end-6 md:inset-14 md:start-8 md:end-12 lg:inset-16 lg:start-10 lg:end-14"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex min-h-svh items-center justify-center">
        <div className="w-full">
          <div className="size-full bg-white text-left shadow-xl transition-all">
            {/* Close button */}
            <button
              className="absolute top-4 right-4 z-10 cursor-pointer text-gray-500"
              style={{ pointerEvents: "auto" }}
              onClick={() => setHidden(true)}
            >
              <BsX size={34} />
            </button>
            <div className="flex min-h-screen items-start justify-center">
              <div className="w-full">
                <div className="relative h-screen p-10 text-center shadow-xl sm:p-0 md:p-0 lg:p-6">
                  <h1 className="mt-3 mb-6 text-3xl font-bold text-black sm:mt-6 sm:mb-0 sm:text-3xl md:text-4xl lg:text-6xl">
                    {user.role === "STUDENT"
                      ? modalTitle[titleIndex]
                      : isMobile
                        ? modalTitle[1]
                        : modalTitle[2]}
                  </h1>

                  {user.role === "STUDENT" ? (
                    <QRCodeTab
                      tabTitles={tabTitles}
                      tabs={tabs}
                      setTitleIndex={setTitleIndex}
                    />
                  ) : (
                    <CompanyTab setHidden={setHidden} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <></>
  );
};

export default QRCodeModal;

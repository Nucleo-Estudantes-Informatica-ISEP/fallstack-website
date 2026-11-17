"use client";

import { LabelHTMLAttributes, useContext } from "react";

import useIsMobile from "@/hooks/useIsMobile";
import InstallableContext from "@/contexts/InstallableContext";
import { InstallPwaDesktop, InstallPwaMobile } from "@/components/ui/Icons";
import { Language } from "@/domain/i18n/translations";

interface InstallButtonProps extends LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
  language?: Language;
}

const InstallButton: React.FC<InstallButtonProps> = ({
  className,
  language = Language.PT,
}) => {
  const { isInstallable, handleConfirm } = useContext(InstallableContext);

  const isMobile = useIsMobile();

  return (
    isInstallable && (
      <button
        onClick={handleConfirm}
        aria-label={
          language === Language.EN ? "Install app" : "Instalar aplicação"
        }
        className={className}
      >
        {isMobile ? (
          <InstallPwaMobile className="text-xl" />
        ) : (
          <InstallPwaDesktop className="text-2xl" />
        )}
      </button>
    )
  );
};

export default InstallButton;

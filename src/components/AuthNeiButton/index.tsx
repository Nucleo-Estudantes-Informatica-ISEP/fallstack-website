"use client";

import { useState } from "react";

import { useUiText } from "@/contexts/UiLanguageContext";
import PrimaryButton from "@/components/ui/PrimaryButton";

interface AuthNeiButtonProps {
  next?: string;
  className?: string;
}

const AuthNeiButton: React.FC<AuthNeiButtonProps> = ({
  next = "/",
  className,
}) => {
  const t = useUiText();

  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    const url = new URL("/api/auth/login", window.location.origin);
    url.searchParams.set("next", next);
    window.location.assign(url.toString());
  };

  return (
    <PrimaryButton
      loading={loading}
      onClick={handleClick}
      variant="form"
      className={`h-12 w-full font-semibold lg:h-16 lg:text-xl ${className ?? ""}`}
    >
      {t("Continuar com AuthNEI")}
    </PrimaryButton>
  );
};

export default AuthNeiButton;

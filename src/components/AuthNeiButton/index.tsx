"use client";

import { useState } from "react";

import PrimaryButton from "@/components/ui/PrimaryButton";

interface AuthNeiButtonProps {
  next?: string;
  className?: string;
}

const AuthNeiButton: React.FC<AuthNeiButtonProps> = ({
  next = "/",
  className,
}) => {
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
      Continuar com AuthNEI
    </PrimaryButton>
  );
};

export default AuthNeiButton;

"use client";

import { useState } from "react";

import PrimaryButton from "@/components/ui/PrimaryButton";

interface AuthNeiButtonProps {
  next?: string;
  className?: string;
  beforeRedirect?: () => void;
  icon?: React.ReactNode;
}

const AuthNeiButton: React.FC<AuthNeiButtonProps> = ({
  next = "/",
  className,
  beforeRedirect,
  icon,
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    beforeRedirect?.();
    const url = new URL("/api/auth/login", window.location.origin);
    url.searchParams.set("next", next);
    window.location.assign(url.toString());
  };

  return (
    <PrimaryButton
      loading={loading}
      onClick={handleClick}
      className={`flex! w-full cursor-pointer items-center! justify-center! gap-2 rounded-none! border! border-[rgba(255,255,255,0.35)]! bg-transparent! px-3! py-3 text-[17px]! font-semibold tracking-normal! hover:bg-white/10! sm:py-4 sm:text-[19px]! ${className ?? ""}`}
    >
      {icon}
      Continuar com AuthNEI
    </PrimaryButton>
  );
};

export default AuthNeiButton;

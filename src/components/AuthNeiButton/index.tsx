"use client";

import { useState } from "react";
import { toast } from "react-toastify";

import config from "@/config";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { createClient } from "@/utils/supabase/client";

import type { Provider } from "@supabase/supabase-js";

interface AuthNeiButtonProps {
  // Where a brand-new AuthNEI identity (no student profile yet) should land
  // after the callback exchange completes. Returning identities are routed
  // to their existing profile/dashboard by the callback route regardless.
  next?: string;
  className?: string;
  // Runs synchronously right before the OAuth redirect. Used by the signup
  // wizard to stash in-progress wizard data, since the browser navigates
  // away entirely and React state would otherwise be lost.
  beforeRedirect?: () => void;
}

const AuthNeiButton: React.FC<AuthNeiButtonProps> = ({
  next = "/signup?authnei=1",
  className,
  beforeRedirect,
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    beforeRedirect?.();

    const supabase = createClient();
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      // "custom:authnei" is Supabase's custom OIDC provider id for AuthNEI
      // (NEI's self-hosted Zitadel instance) — it isn't part of the SDK's
      // built-in Provider union, hence the cast.
      provider: config.constants.authneiProvider as unknown as Provider,
      options: { redirectTo: redirectTo.toString() },
    });

    if (error) {
      toast.error(
        "Não foi possível iniciar sessão com o AuthNEI. Tenta novamente mais tarde."
      );
      setLoading(false);
    }
    // On success the browser navigates away to AuthNEI, so there's no
    // further local state to update here.
  };

  return (
    <PrimaryButton
      loading={loading}
      onClick={handleClick}
      className={`!flex w-full cursor-pointer !items-center !justify-center !rounded-none !border !border-[rgba(255,255,255,0.35)] !bg-transparent !px-3 py-3 !text-[17px] font-semibold !tracking-normal hover:!bg-white/10 sm:py-4 sm:!text-[19px] ${className ?? ""}`}
    >
      Continuar com AuthNEI
    </PrimaryButton>
  );
};

export default AuthNeiButton;

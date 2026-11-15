"use client";

import Link from "next/link";

import useSession from "@/hooks/useSession";
import {
  resolveAccountDestination,
  type AccountDestination,
} from "@/domain/auth/accountDestination";
import { Language } from "@/domain/i18n/translations";

type LinkedDestination = Exclude<AccountDestination, { href: null }>;

const labels: Record<LinkedDestination["kind"], Record<Language, string>> = {
  guest: {
    [Language.PT]: "Quero registar-me no evento",
    [Language.EN]: "Register for the event",
  },
  student: {
    [Language.PT]: "Ver o meu perfil",
    [Language.EN]: "View my profile",
  },
  onboarding: {
    [Language.PT]: "Concluir o meu registo",
    [Language.EN]: "Finish my registration",
  },
  employee: {
    [Language.PT]: "Ir para o dashboard da empresa",
    [Language.EN]: "Go to the company dashboard",
  },
  admin: {
    [Language.PT]: "Abrir a área de administração",
    [Language.EN]: "Open the admin area",
  },
};

const signInLabel: Record<Language, string> = {
  [Language.PT]: "Já tens conta? Inicia sessão",
  [Language.EN]: "Already registered? Sign in",
};

const primaryClassName =
  "ui-focus inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 py-2.5 text-center text-base font-semibold text-background shadow-4xl transition-colors hover:bg-white/85 sm:px-8 sm:text-lg";

// Always reserves the guest layout's height (primary action plus the sign-in
// row), so content around it does not jump when the session resolves.
const rootClassName = "flex min-h-25 flex-col items-center gap-3";

interface HomeCallToActionProps {
  language: Language;
}

// The homepage is statically generated, so the session is only known once
// the browser has asked for it. Until then nothing clickable is rendered:
// showing the guest action first would let a returning student start a new
// registration by mistake.
const HomeCallToAction: React.FC<HomeCallToActionProps> = ({ language }) => {
  const { user, ready } = useSession();

  if (!ready) {
    return (
      <div aria-hidden="true" className={rootClassName}>
        <span className={`${primaryClassName} invisible`}>
          {labels.guest[language]}
        </span>
      </div>
    );
  }

  const destination = resolveAccountDestination(user);
  if (destination.href === null) return null;

  return (
    <div className={rootClassName}>
      <Link href={destination.href} className={primaryClassName}>
        {labels[destination.kind][language]}
      </Link>
      {destination.kind === "guest" && (
        <Link
          href="/login"
          className="ui-focus inline-flex min-h-11 items-center rounded-md px-2 text-sm text-white underline underline-offset-4 drop-shadow-md hover:text-white/80"
        >
          {signInLabel[language]}
        </Link>
      )}
    </div>
  );
};

export default HomeCallToAction;

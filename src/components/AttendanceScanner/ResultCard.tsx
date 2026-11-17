"use client";

import Link from "next/link";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiLock,
  FiXCircle,
} from "react-icons/fi";

import { useUiText } from "@/contexts/UiLanguageContext";
import UiText from "@/components/ui/UiText";
import type { CheckInOutcome } from "@/client/api/attendance";

interface ResultCardProps {
  outcome: CheckInOutcome;
  session: { startTime: string; endTime: string };
  loginHref: string;
}

// Light backgrounds with explicit dark text: the public site's root sets a
// white text colour, so nothing here may inherit it.
const tone = {
  green: "border-green-700 bg-green-100",
  amber: "border-amber-700 bg-amber-100",
  red: "border-red-700 bg-red-100",
  blue: "border-indigo-700 bg-indigo-100",
} as const;

function checkInTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Lisbon",
  });
}

function content(
  outcome: CheckInOutcome,
  session: ResultCardProps["session"],
  t: ReturnType<typeof useUiText>
) {
  switch (outcome.kind) {
    case "recorded":
      return {
        tone: tone.green,
        Icon: FiCheckCircle,
        title: outcome.name,
        detail: t("Check-in registado · {value}", {
          value: checkInTime(outcome.checkedInAt),
        }),
      };
    case "duplicate":
      return {
        tone: tone.amber,
        Icon: FiAlertTriangle,
        title: outcome.name,
        detail: "Já tinha check-in neste período",
      };
    case "invalid-credential":
      return {
        tone: tone.red,
        Icon: FiXCircle,
        title: "Passe inválido ou expirado",
        detail: "Pede para atualizar o QR ou escreve o código",
      };
    case "outside-session":
      return {
        tone: tone.red,
        Icon: FiClock,
        title: "Fora do horário deste período",
        detail: `${session.startTime} – ${session.endTime}`,
      };
    case "session-not-found":
      return {
        tone: tone.red,
        Icon: FiXCircle,
        title: "Período não encontrado",
        detail: "Escolhe outro período",
      };
    case "rate-limited":
      return {
        tone: tone.red,
        Icon: FiClock,
        title: t("Demasiadas leituras, espera {value} s", {
          value: outcome.retryAfterSeconds,
        }),
        detail: null,
      };
    case "unavailable":
      return {
        tone: tone.red,
        Icon: FiXCircle,
        title: "Sem ligação ao servidor, tenta outra vez",
        detail: null,
      };
    case "unauthorized":
      return {
        tone: tone.blue,
        Icon: FiLock,
        title: "A tua autorização expirou (não é problema do estudante).",
        detail: "A leitura está em pausa. O período escolhido fica guardada.",
      };
  }
}

const ResultCard: React.FC<ResultCardProps> = ({
  outcome,
  session,
  loginHref,
}) => {
  const t = useUiText();
  const { tone: toneClass, Icon, title, detail } = content(outcome, session, t);
  return (
    <div
      role="status"
      className={`flex gap-3 rounded-xl border-2 p-3 text-base text-gray-900 shadow-md ${toneClass}`}
    >
      <Icon className="mt-0.5 size-5 shrink-0 text-gray-900" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold text-gray-900">{t(title)}</p>
        {detail && <p className="text-sm text-gray-700">{t(detail)}</p>}
        {outcome.kind === "unauthorized" && (
          <Link
            href={loginHref}
            prefetch={false}
            className="mt-2 inline-block rounded-lg bg-ui-highlight px-3 py-2 text-sm font-bold text-gray-900"
          >
            {" "}
            <UiText text="Entrar de novo com AuthNEI" />{" "}
          </Link>
        )}
      </div>
    </div>
  );
};

export default ResultCard;

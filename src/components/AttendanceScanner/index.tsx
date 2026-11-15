"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiChevronDown } from "react-icons/fi";

import type { AttendanceSessionDto } from "@/types/AttendanceSession";
import QRCodeScanner from "@/components/QRCode/QRCodeScanner";
import {
  credentialFromScan,
  getCheckInCount,
  recordCheckIn,
  type CheckInCredential,
  type CheckInOutcome,
} from "@/client/api/attendance";
import {
  pickCurrentSession,
  sessionStatus,
  type SessionStatus,
} from "@/domain/session/sessionRules";
import { normalizeStudentCode } from "@/domain/student/studentCode";

import ResultCard from "./ResultCard";

export type { AttendanceSessionDto };

export const RESULT_CARD_MS = 3500;
export const COUNT_POLL_MS = 5000;

interface AttendanceScannerProps {
  sessions: AttendanceSessionDto[];
  staffName: string;
  initialSessionId: string | null;
}

const statusLabel: Record<SessionStatus, string> = {
  running: "A DECORRER",
  upcoming: "Ainda não começou",
  ended: "Terminada",
};

const statusClass: Record<SessionStatus, string> = {
  running: "bg-green-100 text-green-900",
  upcoming: "bg-amber-100 text-amber-900",
  ended: "bg-gray-200 text-gray-800",
};

const scanPath = (id: string) =>
  `/attendance/scan?session=${encodeURIComponent(id)}`;

const AttendanceScanner: React.FC<AttendanceScannerProps> = ({
  sessions,
  staffName,
  initialSessionId,
}) => {
  const router = useRouter();
  const windows = useMemo(
    () =>
      sessions.map((session) => ({
        session,
        start: new Date(session.start),
        end: new Date(session.end),
      })),
    [sessions]
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () =>
      (initialSessionId &&
        sessions.some((session) => session.id === initialSessionId) &&
        initialSessionId) ||
      pickCurrentSession(windows, new Date())?.session.id ||
      null
  );
  const [count, setCount] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
  const [paused, setPaused] = useState(false);
  const [showList, setShowList] = useState(false);
  const [typedCode, setTypedCode] = useState("");
  // Blocks new scans while a request is in flight or a card is showing.
  const busy = useRef(false);
  const cardTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selected = windows.find(({ session }) => session.id === selectedId);

  const refreshCount = useCallback(async (sessionId: string) => {
    const result = await getCheckInCount(sessionId);
    if (result.kind === "count") setCount(result.count);
    else if (result.kind === "unauthorized") setPaused(true);
  }, []);

  useEffect(() => {
    if (!selectedId || paused) return;
    void refreshCount(selectedId);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refreshCount(selectedId);
    }, COUNT_POLL_MS);
    return () => clearInterval(interval);
  }, [selectedId, paused, refreshCount]);

  useEffect(() => () => clearTimeout(cardTimer.current), []);

  const submit = useCallback(
    async (credential: CheckInCredential) => {
      if (!selectedId || busy.current || paused) return false;
      busy.current = true;
      const result = await recordCheckIn(selectedId, credential);
      setOutcome(result);
      if (result.kind === "unauthorized") {
        // Paused until the staff member signs in again; never retried.
        setPaused(true);
        return false;
      }
      if (result.kind === "recorded") void refreshCount(selectedId);
      cardTimer.current = setTimeout(() => {
        setOutcome(null);
        busy.current = false;
      }, RESULT_CARD_MS);
      return true;
    },
    [selectedId, paused, refreshCount]
  );

  const handleScan = useCallback(
    async (text: string) => {
      await submit(credentialFromScan(text));
    },
    [submit]
  );

  const handleTyped = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = normalizeStudentCode(typedCode);
    if (!code) return;
    if (await submit({ typedCode: code })) setTypedCode("");
  };

  const chooseSession = (id: string) => {
    clearTimeout(cardTimer.current);
    busy.current = false;
    setOutcome(null);
    setCount(null);
    setSelectedId(id);
    setShowList(false);
    router.replace(scanPath(id));
  };

  const now = new Date();
  const loginHref = selected
    ? `/api/auth/login?next=${encodeURIComponent(scanPath(selected.session.id))}`
    : "/api/auth/login";

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-gray-50 px-4 py-6 text-gray-900">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Presenças</h1>
        <span className="text-sm text-gray-700">{staffName}</span>
      </header>

      {!selected ? (
        <p className="rounded-xl border border-gray-300 bg-white p-4 text-gray-900">
          Não há sessões hoje.
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-gray-300 bg-white p-4 text-gray-900">
            {(() => {
              const status = sessionStatus(selected, now);
              return (
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass[status]}`}
                >
                  {statusLabel[status]}
                </span>
              );
            })()}
            <p className="mt-1 text-lg font-bold text-gray-900">
              {selected.session.title}
            </p>
            <p className="text-sm text-gray-700">
              {`${selected.session.dayTitle} · ${selected.session.startTime} – ${selected.session.endTime}`}
            </p>
            <p
              className="my-2 text-center text-3xl font-bold text-gray-900"
              aria-live="polite"
            >
              {count === null ? "–" : `${count} check-ins`}
            </p>
            <button
              type="button"
              onClick={() => setShowList((open) => !open)}
              aria-expanded={showList}
              className="ml-auto flex items-center gap-1 text-sm font-medium text-gray-900 underline"
            >
              Trocar sessão
              <FiChevronDown className="size-4" aria-hidden />
            </button>
            {showList && (
              <ul className="mt-2 flex flex-col gap-2">
                {windows.map((item) => (
                  <li key={item.session.id}>
                    <button
                      type="button"
                      onClick={() => chooseSession(item.session.id)}
                      className={`w-full rounded-lg border p-2 text-left text-sm text-gray-900 ${
                        item.session.id === selectedId
                          ? "border-2 border-ui-highlight bg-orange-50"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {`${item.session.startTime}–${item.session.endTime} · ${item.session.title} · ${statusLabel[sessionStatus(item, now)]}`}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {paused ? (
            <ResultCard
              outcome={{ kind: "unauthorized" }}
              session={selected.session}
              loginHref={loginHref}
            />
          ) : (
            <>
              <div className="relative overflow-hidden rounded-xl bg-gray-900">
                <QRCodeScanner handleScan={handleScan} />
                {outcome && (
                  <div className="absolute inset-x-2 bottom-2">
                    <ResultCard
                      outcome={outcome}
                      session={selected.session}
                      loginHref={loginHref}
                    />
                  </div>
                )}
              </div>
              <form className="flex gap-2" onSubmit={handleTyped}>
                <input
                  value={typedCode}
                  onChange={(event) => setTypedCode(event.target.value)}
                  placeholder="Código (ex: AB12)"
                  aria-label="Código do estudante"
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-lg border border-gray-400 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-ui-highlight px-4 py-2 font-bold text-gray-900"
                >
                  Registar
                </button>
              </form>
            </>
          )}
        </>
      )}
    </section>
  );
};

export default AttendanceScanner;

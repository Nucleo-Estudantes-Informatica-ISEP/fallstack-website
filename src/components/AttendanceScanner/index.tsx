"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { FiChevronDown } from "react-icons/fi";

import type { AttendanceSessionDto } from "@/types/AttendanceSession";
import QRCodeScanner from "@/components/QRCode/QRCodeScanner";
import ScanCameraFrame from "@/components/ScanCameraFrame";
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
// Re-evaluates session status pills (upcoming / running / ended) over time.
const CLOCK_TICK_MS = 15_000;

interface AttendanceScannerProps {
  sessions: AttendanceSessionDto[];
  initialSessionId: string | null;
}

const statusLabel: Record<SessionStatus, string> = {
  running: "A DECORRER",
  upcoming: "Ainda não começou",
  ended: "Terminada",
};

// Pills keep light backgrounds with dark text so they read on the dark card.
const statusClass: Record<SessionStatus, string> = {
  running: "bg-green-100 text-green-900",
  upcoming: "bg-amber-100 text-amber-900",
  ended: "bg-gray-200 text-gray-800",
};

const scanPath = (id: string) =>
  `/attendance/scan?session=${encodeURIComponent(id)}`;

const AttendanceScanner: React.FC<AttendanceScannerProps> = ({
  sessions,
  initialSessionId,
}) => {
  const router = useRouter();
  const listId = useId();
  const codeHintId = useId();
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
  // Bumped on every session switch; responses from an older generation are
  // dropped so they never show up under the newly selected session.
  const generation = useRef(0);

  const selected = windows.find(({ session }) => session.id === selectedId);

  const refreshCount = useCallback(async (sessionId: string) => {
    const requestGeneration = generation.current;
    const result = await getCheckInCount(sessionId);
    // Expired staff auth applies to every session, so it pauses regardless.
    if (result.kind === "unauthorized") setPaused(true);
    else if (
      result.kind === "count" &&
      requestGeneration === generation.current
    )
      setCount(result.count);
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

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(tick);
  }, []);

  const submit = useCallback(
    async (credential: CheckInCredential) => {
      if (!selectedId || busy.current || paused) return false;
      busy.current = true;
      const requestGeneration = generation.current;
      const result = await recordCheckIn(selectedId, credential);
      if (result.kind === "unauthorized") {
        // Paused until the staff member signs in again; never retried.
        setPaused(true);
        return false;
      }
      // The session changed while the request was in flight: the new session
      // already owns busy and the card, so this result is discarded.
      if (requestGeneration !== generation.current) return false;
      setOutcome(result);
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
    generation.current += 1;
    clearTimeout(cardTimer.current);
    busy.current = false;
    setOutcome(null);
    setCount(null);
    setSelectedId(id);
    setShowList(false);
    router.replace(scanPath(id));
  };

  const loginHref = selected
    ? `/api/auth/login?next=${encodeURIComponent(scanPath(selected.session.id))}`
    : "/api/auth/login";

  return (
    <section className="flex w-full flex-col text-white">
      <h2 className="mb-4 text-2xl font-semibold">Scan</h2>
      <p className="mb-6 text-base">
        Selecione a palestra que o aluno irá assistir e efetue a leitura do QR
        Code para associar o seu perfil à sessão.
      </p>

      {!selected ? (
        <p className="border border-ui-border p-4">Não há sessões hoje.</p>
      ) : (
        <>
          <div>
            <button
              type="button"
              onClick={() => setShowList((open) => !open)}
              aria-expanded={showList}
              aria-controls={listId}
              className="flex min-h-10 w-full items-center justify-between gap-3 border border-white px-3.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-focus"
            >
              <span className="min-w-0 wrap-break-word">
                Seleciona uma palestra
              </span>
              <FiChevronDown
                className={`size-4 shrink-0 transition-transform ${showList ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {showList && (
              <ul id={listId}>
                {windows.map((item) => (
                  <li key={item.session.id}>
                    <button
                      type="button"
                      onClick={() => chooseSession(item.session.id)}
                      aria-current={
                        item.session.id === selectedId ? "true" : undefined
                      }
                      className={`w-full border border-t-0 px-3.5 py-3 text-left text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ui-focus ${
                        item.session.id === selectedId
                          ? "border-ui-highlight bg-ui-highlight/10"
                          : "border-white"
                      }`}
                    >
                      {`${item.session.startTime}–${item.session.endTime} · ${item.session.title} · ${statusLabel[sessionStatus(item, now)]}`}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="my-6 flex flex-col gap-1 border border-ui-border p-4">
            {(() => {
              const status = sessionStatus(selected, now);
              return (
                <span
                  className={`inline-block w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass[status]}`}
                >
                  {statusLabel[status]}
                </span>
              );
            })()}
            <p className="text-lg font-bold">{selected.session.title}</p>
            <p className="text-sm text-ui-muted">
              {`${selected.session.dayTitle} · ${selected.session.startTime} – ${selected.session.endTime}`}
            </p>
            <p
              className="mt-2 text-center text-3xl font-bold"
              aria-live="polite"
            >
              {count === null
                ? "–"
                : `${count} ${count === 1 ? "check-in" : "check-ins"}`}
            </p>
          </div>

          {paused ? (
            <ResultCard
              outcome={{ kind: "unauthorized" }}
              session={selected.session}
              loginHref={loginHref}
            />
          ) : (
            <>
              <ScanCameraFrame>
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
              </ScanCameraFrame>
              <form
                className="mx-auto mt-8 w-full max-w-142"
                onSubmit={handleTyped}
              >
                <div className="relative flex w-full items-center">
                  <input
                    value={typedCode}
                    onChange={(event) => setTypedCode(event.target.value)}
                    placeholder="Código (ex: AB12)"
                    aria-label="Código do estudante"
                    aria-describedby={codeHintId}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    className="ui-field h-14 pr-32 text-lg"
                  />
                  <button
                    type="submit"
                    className="ui-action absolute inset-y-2 right-2 min-h-0 w-28"
                  >
                    Registar
                  </button>
                </div>
                <p
                  id={codeHintId}
                  className="mt-2 text-center text-sm text-ui-muted"
                >
                  Ou introduza o código associado ao QR Code do aluno para que o
                  seu perfil fique registado na sessão.
                </p>
              </form>
            </>
          )}
        </>
      )}
    </section>
  );
};

export default AttendanceScanner;

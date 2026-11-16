"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient, HttpClientError } from "@/lib/http/client";
import { useMutation } from "@/hooks/useMutation";
import CompanySavesSection from "@/components/Companies/CompanyProfile/CompanyHistorySection";
import QRCodeScanner from "@/components/QRCode/QRCodeScanner";
import ScanCameraFrame from "@/components/ScanCameraFrame";
import type { SavedStudentDto } from "@/application/dto/historyDto";
import { getStudentPreviewToken } from "@/client/api/studentToken";
import {
  isStudentCode,
  normalizeStudentCode,
} from "@/domain/student/studentCode";

interface CompanySavedProfilesSectionProps {
  history: SavedStudentDto[];
}

// One toast per message: repeated clicks replace it instead of stacking
// copies.
const EXPORT_FAILED_TOAST = "scan-export-failed";

const SAVE_FAILED = "Não foi possível guardar o perfil. Tenta novamente.";
const DUPLICATE = "Este estudante já foi guardado anteriormente.";

// Camera, scan and typed-code messages all show in one place under the
// camera box, not as toasts: a toast can land over the live preview or the
// controls wherever the page is scrolled. Only the latest message shows.
// The CV export error stays a toast.
type MessageTone = "error" | "warning" | "success";
type PageMessage = {
  text: string;
  tone: MessageTone;
  source: "scan" | "code";
};

const MESSAGE_TONE: Record<MessageTone, string> = {
  error: "border-l-ui-error",
  warning: "border-l-ui-highlight",
  success: "border-l-ui-success",
};

type SaveResult = "saved" | "duplicate" | "failed";

// 409 comes from the duplicate check. An admin employee skips that check, so
// their repeat save hits the database's one-save-per-company rule and comes
// back as 400 "Student already saved" (saveStudent in savedStudentService).
function isAlreadySaved(error: unknown) {
  return (
    error instanceof HttpClientError &&
    (error.status === 409 ||
      (error.status === 400 && error.message === "Student already saved"))
  );
}

function MessagePanel({ message }: { message: PageMessage }) {
  return (
    <p
      className={`mt-3 rounded-md border border-l-4 border-ui-border bg-ui-surface px-4 py-3 text-center text-sm text-ui-text ${MESSAGE_TONE[message.tone]}`}
    >
      {message.text}
    </p>
  );
}

const CompanySavedProfilesSection = ({
  history,
}: CompanySavedProfilesSectionProps) => {
  const [processing, setProcessing] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [message, setMessage] = useState<PageMessage | null>(null);
  // While a scan is processed the camera gives way to a spinner, so a code
  // held in view is read again every few hundred milliseconds. Keep an
  // unchanged message as it is: clearing or replacing it on every read made
  // it blink and repeated it to screen readers.
  const showMessage = useCallback(
    (source: PageMessage["source"], text: string, tone: MessageTone) =>
      setMessage((current) =>
        current?.text === text &&
        current.tone === tone &&
        current.source === source
          ? current
          : { text, tone, source }
      ),
    []
  );
  const showScanMessage = useCallback(
    (text: string, tone: MessageTone) => showMessage("scan", text, tone),
    [showMessage]
  );
  const showScanError = useCallback(
    (text: string) => showScanMessage(text, "error"),
    [showScanMessage]
  );
  const showCodeMessage = (text: string, tone: MessageTone = "error") =>
    showMessage("code", text, tone);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const codeFieldId = useId();
  const codeHintId = useId();
  const exportHintId = useId();
  const { mutate: mutateManualEntry, isPending: isSubmittingManualEntry } =
    useMutation(SAVE_FAILED);
  const wasSubmittingRef = useRef(false);
  const messageRef = useRef<HTMLDivElement>(null);

  // The message sits above the code field, so a typed-code message can be
  // off screen when the field is scrolled to the top. Scroll just enough to
  // show it; focus stays in the field. Instant, because returning focus to
  // the field cancels a smooth scroll partway. Scan messages never scroll
  // the page, so the camera stays where it is.
  useEffect(() => {
    if (message?.source === "code")
      messageRef.current?.scrollIntoView?.({
        block: "nearest",
        behavior: "instant",
      });
  }, [message]);

  // The field and Validar are disabled while a typed code is checked, which
  // drops keyboard focus to the page. Put it back on the field afterwards.
  useEffect(() => {
    const finished = wasSubmittingRef.current && !isSubmittingManualEntry;
    wasSubmittingRef.current = isSubmittingManualEntry;
    const active = document.activeElement;
    if (finished && (!active || active === document.body))
      inputRef.current?.focus();
  }, [isSubmittingManualEntry]);

  function handleStudentProfileOpen(data: string) {
    if (data.startsWith(window.location.origin)) {
      const path = new URL(data).pathname;
      if (path === window.location.pathname) {
        setProcessing(false);
        return;
      }
      router.push(path);
    } else window.open(data, "_self");
    // Processing stays on until the page changes; see handleScan.
  }

  async function handleActionScan(data: string) {
    const actionId = data.replace(/^action-/, "");

    try {
      await httpClient.post(`/actions/${actionId}`);
      showScanMessage(
        "Os teus pontos foram adicionados com sucesso!",
        "success"
      );
    } catch (error) {
      showScanError(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setProcessing(false);
    }
  }

  // Saves the student for this company, then opens the saved preview.
  // A duplicate is a warning; anything else is one Portuguese error, since
  // server and network messages arrive in English. The caller shows the
  // message: under the code field for a typed code, under the camera for a
  // scan.
  async function saveAndOpen(token: string): Promise<SaveResult> {
    try {
      await httpClient.post("/saved", { token });
    } catch (error) {
      return isAlreadySaved(error) ? "duplicate" : "failed";
    }
    router.refresh();
    router.push(`/student/${token}/preview`);
    return "saved";
  }

  const lastFailedScanRef = useRef<string | null>(null);

  const handleScan = async (data: string) => {
    if (data === lastFailedScanRef.current) return;

    try {
      setProcessing(true);

      if (data.match("^https?://.*")) {
        setMessage(null);
        lastFailedScanRef.current = null;
        handleStudentProfileOpen(data);
        return;
      }

      if (data.match("^action-.*")) {
        lastFailedScanRef.current = null;
        await handleActionScan(data);
        return;
      }

      const token = isStudentCode(data)
        ? await getStudentPreviewToken(normalizeStudentCode(data))
        : data;

      if (!token) {
        lastFailedScanRef.current = data;
        showScanError("O código de estudante deste passe é inválido.");
        setProcessing(false);
        return;
      }

      const result = await saveAndOpen(token);
      if (result === "saved") {
        // Keep the spinner up until the preview opens. Bringing the camera
        // back would read the same code again, and that second save would
        // briefly show "already saved" before the page changes.
        lastFailedScanRef.current = null;
        setMessage(null);
        return;
      }
      lastFailedScanRef.current = data;
      if (result === "duplicate") showScanMessage(DUPLICATE, "warning");
      else showScanError(SAVE_FAILED);
      setProcessing(false);
    } catch {
      lastFailedScanRef.current = data;
      setProcessing(false);
      showScanError("Ocorreu um erro a dar scan no QR Code do estudante...");
    }
  };

  const handleManualEntry = () =>
    mutateManualEntry(async () => {
      if (!inputRef.current?.value) {
        showCodeMessage("Sem código inserido.");
        inputRef.current?.focus();
        return;
      }
      setMessage(null);

      const code = normalizeStudentCode(inputRef.current.value);
      if (!isStudentCode(code)) {
        showCodeMessage("O código introduzido é inválido.");
        return;
      }
      let token: string | null;
      try {
        token = await getStudentPreviewToken(code);
      } catch (error) {
        const status = error instanceof HttpClientError ? error.status : 0;
        if (status === 429) {
          showCodeMessage("Demasiadas tentativas. Aguarde um momento.");
          return;
        }
        if (status !== 400) {
          showCodeMessage(SAVE_FAILED);
          return;
        }
        // A malformed code gets the same message as an unknown one.
        token = null;
      }

      if (!token) {
        showCodeMessage("O código introduzido é inválido.");
        return;
      }

      const result = await saveAndOpen(token);
      if (result === "duplicate") showCodeMessage(DUPLICATE, "warning");
      else if (result === "failed") showCodeMessage(SAVE_FAILED);
    });

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleManualEntry();
  };

  const handleDownloadAllCvs = async () => {
    try {
      setDownloading(true);
      const res = await httpClient.raw("/companies/history/cv-zip");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cvs-guardados.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível exportar os CVs. Tenta novamente.", {
        toastId: EXPORT_FAILED_TOAST,
      });
    } finally {
      setDownloading(false);
    }
  };

  const hasSaves = history.length > 0;

  return (
    <section className="flex w-full flex-col items-start justify-start text-white">
      <div className="w-full">
        <h2 className="mb-4 text-2xl font-semibold text-white">Scan</h2>
        <p className="mb-6 text-base text-white">
          Efetue o scan do QR Code dos alunos que visitarem o seu stand, de
          forma a garantir o registo das interações e a participação nos
          giveaways promovidos pelo NEI.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center">
        <ScanCameraFrame>
          {processing ? (
            <div
              className="inline-block size-16 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-primary motion-reduce:animate-[spin_1.5s_linear_infinite]"
              role="status"
            >
              <span className="sr-only">A processar...</span>
            </div>
          ) : (
            <QRCodeScanner handleScan={handleScan} onMessage={showScanError} />
          )}
        </ScanCameraFrame>
        {/* Always rendered, so screen readers announce each new message. */}
        <div
          ref={messageRef}
          role="alert"
          className="w-full field-focus-target"
        >
          {message && <MessagePanel message={message} />}
        </div>
        <p className="mt-3 text-center text-sm text-ui-muted">
          Sem câmara ou sem permissão? Introduza o código abaixo.
        </p>
      </div>

      <div className="mt-8 flex w-full flex-col items-center justify-center">
        <div className="w-full max-w-142">
          <label htmlFor={codeFieldId} className="mb-2 block text-sm">
            Código do estudante
          </label>
          <div className="relative flex w-full items-center">
            <input
              id={codeFieldId}
              type="text"
              placeholder="código"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-describedby={codeHintId}
              className="ui-field h-14 field-focus-target pr-32 text-lg uppercase"
              ref={inputRef}
              onKeyUp={handleKeyUp}
              disabled={isSubmittingManualEntry}
            />
            <button
              type="button"
              onClick={handleManualEntry}
              disabled={isSubmittingManualEntry}
              aria-busy={isSubmittingManualEntry}
              className="ui-action absolute inset-y-2 right-2 min-h-0 w-28 field-focus-target"
            >
              {isSubmittingManualEntry ? "A validar..." : "Validar"}
            </button>
          </div>
          <p id={codeHintId} className="mt-2 text-center text-sm text-ui-muted">
            Introduza o código associado ao QR Code do aluno para que o seu
            perfil fique registado.
          </p>
        </div>
      </div>

      <div className="mt-12 w-full">
        <div className="mb-6 flex flex-col gap-3 text-white md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-semibold">Histórico de scans</h2>
          <div className="flex flex-col items-start gap-1 md:items-end">
            <button
              type="button"
              onClick={handleDownloadAllCvs}
              disabled={downloading || !hasSaves}
              aria-busy={downloading}
              aria-describedby={hasSaves ? undefined : exportHintId}
              className="ui-action field-focus-target text-sm"
            >
              {downloading ? "A preparar..." : "Download CVs"}
            </button>
            {!hasSaves && (
              <p id={exportHintId} className="text-sm text-ui-muted">
                Guarde perfis para poder exportar os CVs.
              </p>
            )}
          </div>
        </div>
        <CompanySavesSection historyData={history} />
      </div>
    </section>
  );
};

export default CompanySavedProfilesSection;

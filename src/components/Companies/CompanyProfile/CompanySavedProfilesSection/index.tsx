"use client";

import React, { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient, HttpClientError } from "@/lib/http/client";
import { useMutation } from "@/hooks/useMutation";
import CompanySavesSection from "@/components/Companies/CompanyProfile/CompanyHistorySection";
import QRCodeScanner from "@/components/QRCode/QRCodeScanner";
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
// copies over the code field.
const TOAST = {
  emptyCode: "scan-empty-code",
  invalidCode: "scan-invalid-code",
  duplicate: "scan-duplicate",
  saveFailed: "scan-save-failed",
  scanFailed: "scan-failed",
  exportFailed: "scan-export-failed",
  tooMany: "scan-too-many",
} as const;

const SAVE_FAILED = "Não foi possível guardar o perfil. Tenta novamente.";
const DUPLICATE = "Este estudante já foi guardado anteriormente.";

const CompanySavedProfilesSection = ({
  history,
}: CompanySavedProfilesSectionProps) => {
  const [processing, setProcessing] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const codeFieldId = useId();
  const codeHintId = useId();
  const exportHintId = useId();
  const { mutate: mutateManualEntry, isPending: isSubmittingManualEntry } =
    useMutation(SAVE_FAILED);

  function handleStudentProfileOpen(data: string) {
    if (data.startsWith(window.location.origin)) {
      const path = new URL(data).pathname;
      router.push(path);
    } else window.open(data, "_self");
    setProcessing(false);
  }

  async function handleActionScan(data: string) {
    const actionId = data.replace(/^action-/, "");

    try {
      await httpClient.post(`/actions/${actionId}`);
      toast.success("Os teus pontos foram adicionados com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setProcessing(false);
    }
  }

  // Saves the student for this company, then opens the saved preview.
  // A duplicate (409) is a warning; anything else is one Portuguese error,
  // since server and network messages arrive in English.
  async function saveAndOpen(token: string) {
    try {
      await httpClient.post("/saved", { token });
    } catch (error) {
      if (error instanceof HttpClientError && error.status === 409) {
        toast.warning(DUPLICATE, { toastId: TOAST.duplicate });
      } else {
        toast.error(SAVE_FAILED, { toastId: TOAST.saveFailed });
      }
      return;
    }
    router.refresh();
    router.push(`/student/${token}/preview`);
  }

  const handleScan = async (data: string) => {
    try {
      setProcessing(true);

      if (data.match("^https?://.*")) {
        handleStudentProfileOpen(data);
        return;
      }

      if (data.match("^action-.*")) {
        await handleActionScan(data);
        return;
      }

      const token = isStudentCode(data)
        ? await getStudentPreviewToken(normalizeStudentCode(data))
        : data;

      if (!token) {
        toast.error("O código de estudante deste passe é inválido.", {
          toastId: TOAST.invalidCode,
        });
        setProcessing(false);
        return;
      }

      await saveAndOpen(token);
      setProcessing(false);
    } catch {
      setProcessing(false);
      toast.error("Ocorreu um erro a dar scan no QR Code do estudante...", {
        toastId: TOAST.scanFailed,
      });
    }
  };

  const handleManualEntry = () =>
    mutateManualEntry(async () => {
      if (!inputRef.current?.value) {
        toast.error("Sem código inserido.", { toastId: TOAST.emptyCode });
        inputRef.current?.focus();
        return;
      }

      const code = inputRef.current?.value;
      let token: string | null;
      try {
        token = await getStudentPreviewToken(code);
      } catch (error) {
        const status = error instanceof HttpClientError ? error.status : 0;
        if (status === 429) {
          toast.error("Demasiadas tentativas. Aguarde um momento.", {
            toastId: TOAST.tooMany,
          });
          return;
        }
        if (status !== 400) {
          toast.error(SAVE_FAILED, { toastId: TOAST.saveFailed });
          return;
        }
        // A malformed code gets the same message as an unknown one.
        token = null;
      }

      if (!token) {
        toast.error("O código introduzido é inválido.", {
          toastId: TOAST.invalidCode,
        });
        inputRef.current?.focus();
        return;
      }

      await saveAndOpen(token);
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
        toastId: TOAST.exportFailed,
      });
    } finally {
      setDownloading(false);
    }
  };

  const hasSaves = history.length > 0;

  return (
    <section className="flex w-full flex-col items-start justify-start text-white">
      <div className="w-full">
        <h2 className="mb-6 font-sans text-[25px] leading-none font-semibold text-white">
          Scan
        </h2>
        <p className="mb-8 text-base text-ui-muted">
          Efetue o scan do QR Code dos alunos que visitarem o seu stand, de
          forma a garantir o registo das interações e a participação nos
          giveaways promovidos pelo NEI.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center">
        {/* `relative` contains the scanner's own "A ligar a tua câmara..."
            overlay inside this box. */}
        <div className="relative flex aspect-4/3 w-full max-w-2xl items-center justify-center overflow-hidden rounded-lg border border-ui-border bg-black [&_video]:size-full [&_video]:object-cover [&>div]:size-full">
          {processing ? (
            <div
              className="inline-block size-16 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-primary motion-reduce:animate-[spin_1.5s_linear_infinite]"
              role="status"
            >
              <span className="sr-only">A processar...</span>
            </div>
          ) : (
            <QRCodeScanner handleScan={handleScan} />
          )}
        </div>
        <p className="mt-3 max-w-2xl text-center text-sm text-ui-muted">
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
              className="ui-field h-14 pr-32 text-lg uppercase"
              ref={inputRef}
              onKeyUp={handleKeyUp}
              maxLength={4}
              disabled={isSubmittingManualEntry}
            />
            <button
              type="button"
              onClick={handleManualEntry}
              disabled={isSubmittingManualEntry}
              aria-busy={isSubmittingManualEntry}
              className="ui-action absolute inset-y-2 right-2 min-h-0 w-28"
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
          <h2 className="font-sans text-[25px] leading-none font-semibold">
            Histórico de scans
          </h2>
          <div className="flex flex-col items-start gap-1 md:items-end">
            <button
              type="button"
              onClick={handleDownloadAllCvs}
              disabled={downloading || !hasSaves}
              aria-busy={downloading}
              aria-describedby={hasSaves ? undefined : exportHintId}
              className="ui-action text-sm"
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

"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient, HttpClientError } from "@/lib/http/client";
import { useMutation } from "@/hooks/useMutation";
import CompanySavesSection from "@/components/Companies/CompanyProfile/CompanyHistorySection";
import QRCodeScanner from "@/components/QRCode/QRCodeScanner";
import type { SavedStudentDto } from "@/application/dto/historyDto";
import { jwtStudent } from "@/application/services/studentTokenService";

interface CompanySavedProfilesSectionProps {
  history: SavedStudentDto[];
}

const CompanySavedProfilesSection = ({
  history,
}: CompanySavedProfilesSectionProps) => {
  const [processing, setProcessing] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: mutateManualEntry, isPending: isSubmittingManualEntry } =
    useMutation("Ocorreu um erro.");

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

      try {
        await httpClient.post("/saved", { token: data });
        router.refresh();
        router.push(`/student/${data}/preview`);
      } catch (error) {
        if (error instanceof HttpClientError && error.status === 409) {
          toast.warning("Este estudante já foi guardado anteriormente.");
        } else if (error instanceof HttpClientError) {
          toast.error(error.message || "Erro ao guardar perfil");
        } else {
          throw error;
        }
      }

      setProcessing(false);
    } catch {
      setProcessing(false);
      toast.error("Ocorreu um erro a dar scan no QR Code do estudante...");
    }
  };

  const handleManualEntry = () =>
    mutateManualEntry(async () => {
      if (!inputRef.current?.value) {
        toast.error("Sem código inserido.");
        return;
      }

      const code = inputRef.current?.value;
      const token = await jwtStudent(code);

      if (!token) {
        toast.error("O código introduzido é inválido.");
        return;
      }

      try {
        await httpClient.post("/saved", { token });
        router.refresh();
        router.push(`/student/${token}/preview`);
      } catch (error) {
        if (error instanceof HttpClientError && error.status === 409) {
          toast.warning("Este estudante já foi guardado anteriormente.");
        } else {
          toast.error(
            error instanceof Error ? error.message : "Failed to save profile"
          );
        }
      }
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
      setDownloading(false);
    } catch (error) {
      setDownloading(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível exportar os CVs."
      );
    }
  };

  return (
    <section className="flex w-full flex-col items-start justify-start px-4 pt-2 pb-4 text-white md:px-8 md:pt-4 md:pb-8">
      <div className="w-full">
        <h1
          className="mb-6 text-white"
          style={{
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "25px",
            lineHeight: "100%",
          }}
        >
          Scan
        </h1>
        <p
          className="mb-8 text-gray-300"
          style={{
            fontFamily: "Inter",
            fontWeight: 400,
            fontSize: "15px",
            lineHeight: "100%",
            textAlign: "justify",
          }}
        >
          Efetue o scan do QR Code dos alunos que visitarem o seu stand, de
          forma a garantir o registo das interações e a participação nos
          giveaways promovidos pelo NEI.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center">
        {processing ? (
          <div
            className="mt-12 inline-block size-24 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] text-primary motion-reduce:animate-[spin_1.5s_linear_infinite]"
            role="status"
          >
            <span className="absolute! -m-px! h-px! w-px! overflow-hidden! border-0! p-0! whitespace-nowrap! [clip:rect(0,0,0,0)]!">
              A processar...
            </span>
          </div>
        ) : (
          <div className="w-full max-w-2xl overflow-hidden bg-gray-300">
            <QRCodeScanner handleScan={handleScan} />
          </div>
        )}
      </div>

      <div className="mt-8 flex w-full flex-col items-center justify-center">
        <div className="relative flex w-full max-w-[568px] items-center">
          <input
            type="text"
            placeholder="código"
            className="h-14 w-full border border-white bg-transparent px-6 text-lg text-white placeholder-white outline-none focus:border-primary"
            style={{
              fontFamily: "Inter",
              fontWeight: 400,
            }}
            ref={inputRef}
            onKeyUp={handleKeyUp}
            maxLength={4}
            disabled={isSubmittingManualEntry}
          />
          <button
            onClick={handleManualEntry}
            disabled={isSubmittingManualEntry}
            className="absolute top-2 right-2 bottom-2 flex w-[104px] items-center justify-center bg-[#82360D] text-base text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              fontFamily: "Inter",
              fontWeight: 400,
              lineHeight: "100%",
            }}
          >
            {isSubmittingManualEntry ? "..." : "Validar"}
          </button>
        </div>
        <p
          className="mt-2 text-gray-500"
          style={{
            fontFamily: "Inter",
            fontWeight: 400,
            fontSize: "11px",
            lineHeight: "100%",
            textAlign: "center",
          }}
        >
          ou introduza o código associado ao QR Code do aluno para que o seu
          perfil fique registado.
        </p>
      </div>

      <div className="mt-12 w-full">
        <div className="mb-6 flex flex-col gap-3 text-white md:flex-row md:items-center md:justify-between">
          <h2
            style={{
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: "25px",
              lineHeight: "100%",
            }}
          >
            Histórico de scans
          </h2>
          <button
            onClick={handleDownloadAllCvs}
            disabled={downloading}
            className="inline-flex items-center justify-center bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? "A preparar..." : "Download CVs"}
          </button>
        </div>
        <div className="w-full border-b border-white pb-2">
          <div
            className="flex w-full justify-between px-4 text-white"
            style={{
              fontFamily: "Inter", // Assuming Font 1 is Inter
              fontWeight: 700,
              fontSize: "15.63px",
              lineHeight: "24px",
              letterSpacing: "-0.48px",
            }}
          >
            <span className="flex-1 text-center">Nome</span>
            <span className="flex-1 text-center">Data</span>
          </div>
        </div>
        <CompanySavesSection historyData={history} />
      </div>
    </section>
  );
};

export default CompanySavedProfilesSection;

"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Company } from "@prisma/client";
import { toast } from "react-toastify";
import swal from "sweetalert";

import { jwtStudent } from "@/lib/jwtStudent";
import { BASE_URL } from "@/services/api";
import CompanySavesSection from "@/components/Companies/CompanyProfile/CompanyHistorySection";
import QRCodeScanner from "@/components/QRCode/QRCodeScanner";

interface StatsProps {
  company: Company;
}

const CompanySavedProfilesSection: React.FC<StatsProps> = ({ company }) => {
  const [processing, setProcessing] = useState<boolean>(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleStudentProfileOpen(data: string) {
    if (data.startsWith(window.location.origin)) {
      const path = new URL(data).pathname;
      router.push(path);
    } else window.open(data, "_self");
  }

  async function handleActionScan(data: string) {
    const actionId = data.split("-")[1];

    const res = await fetch(BASE_URL + `/actions/${actionId}`, {
      method: "POST",
    });

    if (!res.ok) {
      const error = (await res.json()).error;
      swal("Erro", error, "error");
      setProcessing(false);
      return;
    }

    swal("Sucesso", "Os teus pontos foram adicionados com sucesso!", "success");
    setProcessing(false);
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

      await fetch(BASE_URL + "/saved", {
        method: "POST",
        body: JSON.stringify({ token: data }),
      });

      router.push(`/student/${data}/preview`);
      setProcessing(false);
    } catch (error) {
      setProcessing(false);
      toast.error("Ocorreu um erro a dar scan no QR Code do estudante...");
    }
  };

  const handleManualEntry = async () => {
    if (!inputRef.current?.value) {
      toast.error("Sem código inserido.");
      return;
    }

    const code = inputRef.current?.value;

    if (code) {
      const token = await jwtStudent(code);

      if (!token)
        return swal("Erro", "O código introduzido é inválido.", "error");

      await fetch(BASE_URL + "/saved", {
        method: "POST",
        body: JSON.stringify({ token }),
      });

      router.push(`/student/${token}/preview`);
    } else {
      toast.error("Ocorreu um erro.");
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleManualEntry();
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
            className="text-primary mt-12 inline-block size-24 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
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
            className="focus:border-primary h-14 w-full border border-white bg-transparent px-6 text-lg text-white placeholder-white outline-none"
            style={{
              fontFamily: "Inter",
              fontWeight: 400,
            }}
            ref={inputRef}
            onKeyUp={handleKeyUp}
            maxLength={4}
          />
          <button
            onClick={handleManualEntry}
            className="absolute top-2 right-2 bottom-2 flex w-[104px] items-center justify-center bg-[#82360D] text-base text-white hover:opacity-90"
            style={{
              fontFamily: "Inter",
              fontWeight: 400,
              lineHeight: "100%",
            }}
          >
            Validar
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
        <h2
          className="mb-6 text-white"
          style={{
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "25px",
            lineHeight: "100%",
          }}
        >
          Histórico de scans
        </h2>
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
        <CompanySavesSection company={company} />
      </div>
    </section>
  );
};

export default CompanySavedProfilesSection;

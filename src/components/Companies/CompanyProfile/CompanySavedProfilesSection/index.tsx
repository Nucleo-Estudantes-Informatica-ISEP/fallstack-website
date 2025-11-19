"use client";

import React, { useState } from "react";
import { Company } from "@prisma/client";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import swal from "sweetalert";

import CompanySavesSection from "@/components/Companies/CompanyProfile/CompanyHistorySection";
import DownloadButton from "@/components/DownloadButton";
import QRCodeScanner from "@/components/QRCode/QRCodeScanner";
import { BASE_URL } from "@/services/api";

interface StatsProps {
  company: Company;
}

const CompanySavedProfilesSection: React.FC<StatsProps> = ({ company }) => {
  const [processing, setProcessing] = useState<boolean>(false);
  const router = useRouter();

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

  return (
    <section className="flex w-full flex-col items-center justify-center rounded-t-3xl bg-white p-4 text-black md:rounded-md md:p-8">
      <div className="relative w-full">
        <h1 className="mx-auto mt-6 w-3/4 text-center text-2xl font-extrabold uppercase">
          Scan de Perfil
        </h1>
        <DownloadButton className="absolute right-2 top-6 text-3xl" />
      </div>

      <div className="my-8 flex w-full flex-col items-center justify-center">
        {processing ? (
          <div
            className="mt-12 inline-block size-24 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] text-primary motion-reduce:animate-[spin_1.5s_linear_infinite]"
            role="status"
          >
            <span className="absolute! -m-px! h-px! w-px! overflow-hidden! whitespace-nowrap! border-0! p-0! [clip:rect(0,0,0,0)]!">
              A processar...
            </span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border-4 border-primary">
             <QRCodeScanner handleScan={handleScan} />
          </div>
        )}
        <p className="mt-4 text-center text-gray-600">
          Aponta a câmara para o QR Code do estudante
        </p>
      </div>

      <div className="w-full border-t border-gray-200 pt-8">
        <h2 className="mb-6 text-center text-xl font-bold uppercase text-gray-800">
          Perfis Salvos Recentemente
        </h2>
        <CompanySavesSection company={company} />
      </div>
    </section>
  );
};

export default CompanySavedProfilesSection;

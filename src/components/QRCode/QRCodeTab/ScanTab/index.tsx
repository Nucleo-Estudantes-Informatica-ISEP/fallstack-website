"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient, HttpClientError } from "@/lib/http/client";
import QRCodeScanner from "@/components/QRCode/QRCodeScanner";

interface ScanTabProps {
  setHidden: React.Dispatch<React.SetStateAction<boolean>>;
}

const ScanTab: React.FC<ScanTabProps> = ({ setHidden }) => {
  const [processing, setProcessing] = React.useState<boolean>(false);
  const router = useRouter();

  function handleStudentProfileOpen(data: string) {
    if (data.startsWith(window.location.origin)) {
      const path = new URL(data).pathname;
      router.push(path);
      setHidden(true);
    } else window.open(data, "_self");
  }

  async function handleActionScan(data: string) {
    const actionId = data.replace(/^action-/, "");

    try {
      await httpClient.post(`/actions/${actionId}`);
      toast.success("Os teus pontos foram adicionados com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro inesperado");
    }

    setHidden(true);
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

      try {
        await httpClient.post("/saved", { token: data });
      } catch (error) {
        if (error instanceof HttpClientError && error.status === 409) {
          toast.warning("Este estudante já foi guardado anteriormente.");
        } else {
          toast.error(
            error instanceof Error ? error.message : "Erro ao guardar perfil"
          );
        }
        setProcessing(false);
        return;
      }

      setHidden(true);
      router.push(`/student/${data}/preview`);

      /* it's dumb doing this for sure, but if i dont set a delay, on mobile, it wont let open the
       camera again and the user will need to close and open the modal again so, this is a workaround
       the user won't even feel the delay delay */

      setProcessing(false);
    } catch {
      setProcessing(false);
      toast.error("Ocorreu um erro a dar scan no QR Code do estudante...");
    }
  };

  return (
    <div className="mt-6 grid grid-cols-1 sm:mt-0 sm:grid-cols-1 md:mt-0 lg:mt-12">
      <div className="flex items-center justify-center">
        {processing ? (
          <div
            className="mt-24 inline-block size-24 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] text-primary motion-reduce:animate-[spin_1.5s_linear_infinite]"
            role="status"
          >
            <span className="absolute! -m-px! size-px overflow-hidden! border-0! p-0! whitespace-nowrap! [clip:rect(0,0,0,0)]!">
              A processar...
            </span>
          </div>
        ) : (
          <QRCodeScanner handleScan={handleScan} />
        )}
      </div>
    </div>
  );
};

export default ScanTab;

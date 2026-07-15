"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import swal from "sweetalert";

import { BASE_URL } from "@/services/api";
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

    const res = await fetch(BASE_URL + `/actions/${actionId}`, {
      method: "POST",
    });

    if (!res.ok) {
      const error = (await res.json()).error;
      swal("Erro", error, "error");
      setHidden(true);
      setProcessing(false);
      return;
    }

    swal("Sucesso", "Os teus pontos foram adicionados com sucesso!", "success");

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

      const res = await fetch(BASE_URL + "/saved", {
        method: "POST",
        body: JSON.stringify({ token: data }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        if (res.status === 409) {
          swal(
            "Aviso",
            "Este estudante já foi guardado anteriormente.",
            "warning"
          );
        } else {
          toast.error(error || "Erro ao guardar perfil");
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
            <span className="absolute! -m-px! h-px! w-px! overflow-hidden! border-0! p-0! whitespace-nowrap! [clip:rect(0,0,0,0)]!">
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

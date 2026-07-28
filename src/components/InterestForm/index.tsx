"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import type { InterestDto } from "@/application/dto/interestDto";

interface InterestFormProps {
  interest?: InterestDto;
}

const InterestForm: React.FC<InterestFormProps> = ({ interest }) => {
  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const payload = { name: values.name };

    try {
      if (interest) {
        await httpClient.patch(`/admin/interests/${interest.id}`, payload);
        toast.success("Interesse atualizado.");
      } else {
        await httpClient.post("/admin/interests", payload);
        toast.success("Interesse criado.");
      }
      router.push("/interests");
      router.refresh();
    } catch {
      toast.error("Não foi possível guardar o interesse.");
    }
  };

  return (
    <AdminForm
      id={interest?.id}
      sections={[
        {
          kind: "fields",
          title: "Detalhes",
          fields: [
            { kind: "text", name: "name", label: "Nome", required: true },
          ],
        },
      ]}
      defaultValues={interest ? { name: interest.name } : {}}
      onSubmit={handleSubmit}
    />
  );
};

export default InterestForm;

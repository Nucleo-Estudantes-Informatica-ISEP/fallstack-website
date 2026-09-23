"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import type { AdminInterestDto } from "@/application/dto/interestDto";

interface InterestFormProps {
  interest?: AdminInterestDto;
}

const InterestForm: React.FC<InterestFormProps> = ({ interest }) => {
  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const payload = { name: { PT: values.namePT, EN: values.nameEN } };

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
            {
              kind: "text",
              name: "namePT",
              label: "Nome (PT)",
              required: true,
            },
            {
              kind: "text",
              name: "nameEN",
              label: "Nome (EN)",
              required: true,
            },
          ],
        },
      ]}
      defaultValues={
        interest ? { namePT: interest.name.PT, nameEN: interest.name.EN } : {}
      }
      onSubmit={handleSubmit}
    />
  );
};

export default InterestForm;

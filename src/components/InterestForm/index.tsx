"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import { useUiText } from "@/contexts/UiLanguageContext";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import type { AdminInterestDto } from "@/application/dto/interestDto";

interface InterestFormProps {
  interest?: AdminInterestDto;
}

const InterestForm: React.FC<InterestFormProps> = ({ interest }) => {
  const t = useUiText();

  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const payload = { name: { PT: values.namePT, EN: values.nameEN } };

    try {
      if (interest) {
        await httpClient.patch(`/admin/interests/${interest.id}`, payload);
        toast.success(t("Interesse atualizado."));
      } else {
        await httpClient.post("/admin/interests", payload);
        toast.success(t("Interesse criado."));
      }
      router.push("/interests");
      router.refresh();
    } catch {
      toast.error(t("Não foi possível guardar o interesse."));
    }
  };

  return (
    <AdminForm
      cancelHref="/interests"
      id={interest?.id}
      sections={[
        {
          kind: "fields",
          title: t("Detalhes"),
          fields: [
            {
              kind: "text",
              name: "namePT",
              label: t("Nome (PT)"),
              required: true,
            },
            {
              kind: "text",
              name: "nameEN",
              label: t("Nome (EN)"),
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

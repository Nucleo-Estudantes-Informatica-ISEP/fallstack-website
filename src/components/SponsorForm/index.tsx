"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import { useUiText } from "@/contexts/UiLanguageContext";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import type { AdminSponsorDto } from "@/application/dto/sponsorDto";

interface SponsorFormProps {
  sponsor?: AdminSponsorDto;
}

const SponsorForm: React.FC<SponsorFormProps> = ({ sponsor }) => {
  const t = useUiText();

  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const payload = {
      name: values.name,
      ...(sponsor?.logo === values.logo ? {} : { logo: values.logo }),
      website: values.website || null,
      order: values.order,
      active: values.active,
    };

    try {
      if (sponsor) {
        await httpClient.patch(`/admin/sponsors/${sponsor.id}`, payload);
        toast.success(t("Patrocinador atualizado."));
      } else {
        await httpClient.post("/admin/sponsors", payload);
        toast.success(t("Patrocinador criado."));
      }
      router.push("/sponsors");
      router.refresh();
    } catch {
      toast.error(t("Não foi possível guardar o patrocinador."));
    }
  };

  return (
    <AdminForm
      cancelHref="/sponsors"
      id={sponsor?.id}
      sections={[
        {
          kind: "image",
          title: t("Logótipo"),
          name: "logo",
          uploadKind: "logo",
          currentUrl: sponsor?.logo ?? undefined,
        },
        {
          kind: "fields",
          title: t("Detalhes"),
          fields: [
            { kind: "text", name: "name", label: t("Nome"), required: true },
            { kind: "text", name: "website", label: "Website" },
            { kind: "number", name: "order", label: t("Ordem") },
            { kind: "checkbox", name: "active", label: t("Ativo") },
          ],
        },
      ]}
      defaultValues={
        sponsor
          ? {
              name: sponsor.name,
              website: sponsor.website ?? "",
              order: sponsor.order,
              active: sponsor.active,
            }
          : { order: 0, active: false }
      }
      onSubmit={handleSubmit}
    />
  );
};

export default SponsorForm;

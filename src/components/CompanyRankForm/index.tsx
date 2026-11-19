"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient, HttpClientError } from "@/lib/http/client";
import { useUiText } from "@/contexts/UiLanguageContext";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import type { AdminCompanyRankDto } from "@/application/dto/companyRankDto";

interface CompanyRankFormProps {
  rank?: AdminCompanyRankDto;
}

const CompanyRankForm: React.FC<CompanyRankFormProps> = ({ rank }) => {
  const t = useUiText();

  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const payload = {
      name: values.name,
      order: values.order,
      style: {
        gradientFromColor: values.gradientFromColor,
        gradientFromStop: values.gradientFromStop,
        gradientToColor: values.gradientToColor,
        gradientToStop: values.gradientToStop,
        hasInternalPage: values.hasInternalPage,
        showsPromoVideo: values.showsPromoVideo,
        isFeatured: values.isFeatured,
      },
    };

    try {
      if (rank) {
        await httpClient.patch(`/admin/company-ranks/${rank.id}`, payload);
        toast.success(t("Rank atualizado."));
      } else {
        await httpClient.post("/admin/company-ranks", payload);
        toast.success(t("Rank criado."));
      }
      router.push("/companies/ranks");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof HttpClientError
          ? error.message
          : t("Não foi possível guardar o rank.")
      );
    }
  };

  return (
    <AdminForm
      cancelHref="/companies/ranks"
      id={rank?.id}
      sections={[
        {
          kind: "fields",
          title: t("Detalhes"),
          fields: [
            { kind: "text", name: "name", label: t("Nome"), required: true },
            { kind: "number", name: "order", label: t("Ordem") },
          ],
        },
        {
          kind: "fields",
          title: t("Estilo (gradiente do título)"),
          fields: [
            {
              kind: "text",
              name: "gradientFromColor",
              label: t("Cor inicial (ex: #000999)"),
              required: true,
            },
            {
              kind: "text",
              name: "gradientFromStop",
              label: t("Paragem inicial (ex: 13%)"),
              required: true,
            },
            {
              kind: "text",
              name: "gradientToColor",
              label: t("Cor final (ex: #3284FF)"),
              required: true,
            },
            {
              kind: "text",
              name: "gradientToStop",
              label: t("Paragem final (ex: 89%)"),
              required: true,
            },
            {
              kind: "checkbox",
              name: "isFeatured",
              label: t(
                "Destaque (empresas abaixo do banner da página inicial)"
              ),
            },
            {
              kind: "checkbox",
              name: "hasInternalPage",
              label: t("Tem página interna (/company/[nome])"),
            },
            {
              kind: "checkbox",
              name: "showsPromoVideo",
              label: t("Mostra vídeo promocional na página interna"),
            },
          ],
        },
      ]}
      defaultValues={
        rank
          ? {
              name: rank.name,
              order: rank.order,
              gradientFromColor: rank.style?.gradientFromColor ?? "",
              gradientFromStop: rank.style?.gradientFromStop ?? "",
              gradientToColor: rank.style?.gradientToColor ?? "",
              gradientToStop: rank.style?.gradientToStop ?? "",
              hasInternalPage: rank.style?.hasInternalPage ?? false,
              showsPromoVideo: rank.style?.showsPromoVideo ?? false,
              isFeatured: rank.style?.isFeatured ?? false,
            }
          : {
              order: 0,
              hasInternalPage: false,
              showsPromoVideo: false,
              isFeatured: false,
            }
      }
      onSubmit={handleSubmit}
    />
  );
};

export default CompanyRankForm;

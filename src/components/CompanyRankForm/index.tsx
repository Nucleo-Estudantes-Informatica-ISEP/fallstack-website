"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient, HttpClientError } from "@/lib/http/client";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import type { AdminCompanyRankDto } from "@/application/dto/companyRankDto";

interface CompanyRankFormProps {
  rank?: AdminCompanyRankDto;
}

const CompanyRankForm: React.FC<CompanyRankFormProps> = ({ rank }) => {
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
      },
    };

    try {
      if (rank) {
        await httpClient.patch(`/admin/company-ranks/${rank.id}`, payload);
        toast.success("Rank atualizado.");
      } else {
        await httpClient.post("/admin/company-ranks", payload);
        toast.success("Rank criado.");
      }
      router.push("/companies/ranks");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof HttpClientError
          ? error.message
          : "Não foi possível guardar o rank."
      );
    }
  };

  return (
    <AdminForm
      id={rank?.id}
      sections={[
        {
          kind: "fields",
          title: "Detalhes",
          fields: [
            { kind: "text", name: "name", label: "Nome", required: true },
            { kind: "number", name: "order", label: "Ordem" },
          ],
        },
        {
          kind: "fields",
          title: "Estilo (gradiente do título)",
          fields: [
            {
              kind: "text",
              name: "gradientFromColor",
              label: "Cor inicial (ex: #000999)",
              required: true,
            },
            {
              kind: "text",
              name: "gradientFromStop",
              label: "Paragem inicial (ex: 13%)",
              required: true,
            },
            {
              kind: "text",
              name: "gradientToColor",
              label: "Cor final (ex: #3284FF)",
              required: true,
            },
            {
              kind: "text",
              name: "gradientToStop",
              label: "Paragem final (ex: 89%)",
              required: true,
            },
            {
              kind: "checkbox",
              name: "hasInternalPage",
              label: "Tem página interna (/company/[nome])",
            },
            {
              kind: "checkbox",
              name: "showsPromoVideo",
              label: "Mostra vídeo promocional na página interna",
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
            }
          : { order: 0, hasInternalPage: false, showsPromoVideo: false }
      }
      onSubmit={handleSubmit}
    />
  );
};

export default CompanyRankForm;

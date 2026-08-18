"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient, HttpClientError } from "@/lib/http/client";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import type { AdminCompanyDto } from "@/application/dto/companyDto";

interface CompanyFormProps {
  company?: AdminCompanyDto;
  ranks: { id: string; name: string }[];
}

const CompanyForm: React.FC<CompanyFormProps> = ({ company, ranks }) => {
  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const payload = {
      name: values.name,
      rankId: values.rankId,
      website: values.website || null,
      avatar: values.avatar || null,
      order: values.order,
      active: values.active,
    };

    try {
      if (company) {
        await httpClient.patch(`/admin/companies/${company.id}`, payload);
        toast.success("Empresa atualizada.");
      } else {
        await httpClient.post("/admin/companies", payload);
        toast.success("Empresa criada.");
      }
      router.push("/companies");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof HttpClientError
          ? error.message
          : "Não foi possível guardar a empresa."
      );
    }
  };

  return (
    <AdminForm
      id={company?.id}
      sections={[
        {
          kind: "image",
          title: "Logótipo",
          name: "avatar",
          currentUrl: company?.avatar ?? undefined,
        },
        {
          kind: "fields",
          title: "Detalhes",
          fields: [
            { kind: "text", name: "name", label: "Nome", required: true },
            {
              kind: "select",
              name: "rankId",
              label: "Rank",
              options: ranks.map((rank) => ({
                label: rank.name,
                value: rank.id,
              })),
              required: true,
            },
            { kind: "text", name: "website", label: "Website" },
            { kind: "number", name: "order", label: "Ordem" },
            { kind: "checkbox", name: "active", label: "Ativa" },
          ],
        },
      ]}
      defaultValues={
        company
          ? {
              name: company.name,
              rankId: company.rank.id,
              website: company.website ?? "",
              order: company.order,
              active: company.active,
            }
          : { rankId: ranks[0]?.id ?? "", order: 0, active: false }
      }
      onSubmit={handleSubmit}
    />
  );
};

export default CompanyForm;

"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import type { AdminCompanyDto } from "@/application/dto/companyDto";

interface CompanyFormProps {
  company?: AdminCompanyDto;
}

const TIER_OPTIONS = [
  { label: "Diamond", value: "DIAMOND" },
  { label: "Gold", value: "GOLD" },
  { label: "Silver", value: "SILVER" },
  { label: "Bronze", value: "BRONZE" },
];

const CompanyForm: React.FC<CompanyFormProps> = ({ company }) => {
  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const payload = {
      name: values.name,
      tier: values.tier,
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
    } catch {
      toast.error("Não foi possível guardar a empresa.");
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
              name: "tier",
              label: "Tier",
              options: TIER_OPTIONS,
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
              tier: company.tier,
              website: company.website ?? "",
              order: company.order,
              active: company.active,
            }
          : { tier: "BRONZE", order: 0, active: false }
      }
      onSubmit={handleSubmit}
    />
  );
};

export default CompanyForm;

"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import type { AdminActionDto } from "@/application/dto/actionDto";

interface ActionFormProps {
  action?: AdminActionDto;
  companies: { id: string; name: string }[];
}

const NO_COMPANY = "";

const ActionForm: React.FC<ActionFormProps> = ({ action, companies }) => {
  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const payload = {
      name: values.name,
      description: values.description,
      points: values.points,
      altText: values.altText || null,
      isVisible: values.isVisible,
      companyId: values.companyId === NO_COMPANY ? null : values.companyId,
    };

    try {
      if (action) {
        await httpClient.patch(`/admin/actions/${action.id}`, payload);
        toast.success("Ação atualizada.");
      } else {
        await httpClient.post("/admin/actions", payload);
        toast.success("Ação criada.");
      }
      router.push("/actions");
      router.refresh();
    } catch {
      toast.error("Não foi possível guardar a ação.");
    }
  };

  return (
    <AdminForm
      id={action?.id}
      sections={[
        {
          kind: "fields",
          title: "Detalhes",
          fields: [
            { kind: "text", name: "name", label: "Nome", required: true },
            {
              kind: "text",
              name: "description",
              label: "Descrição",
              required: true,
            },
            {
              kind: "number",
              name: "points",
              label: "Pontos",
              required: true,
            },
            { kind: "text", name: "altText", label: "Texto alternativo" },
            { kind: "checkbox", name: "isVisible", label: "Visível" },
            {
              kind: "select",
              name: "companyId",
              label: "Ação de banca (empresa)",
              options: [
                { label: "Nenhuma - ação geral", value: NO_COMPANY },
                ...companies.map((company) => ({
                  label: company.name,
                  value: company.id,
                })),
              ],
            },
          ],
        },
      ]}
      defaultValues={
        action
          ? {
              name: action.name,
              description: action.description,
              points: action.points,
              altText: action.altText ?? "",
              isVisible: action.isVisible,
              companyId: action.companyId ?? NO_COMPANY,
            }
          : { points: 0, isVisible: true, companyId: NO_COMPANY }
      }
      onSubmit={handleSubmit}
    />
  );
};

export default ActionForm;

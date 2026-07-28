"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import type { ActionDto } from "@/application/dto/actionDto";

interface ActionFormProps {
  action?: ActionDto;
}

const ActionForm: React.FC<ActionFormProps> = ({ action }) => {
  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const payload = {
      name: values.name,
      description: values.description,
      points: values.points,
      altText: values.altText || null,
      isVisible: values.isVisible,
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
            }
          : { points: 0, isVisible: true }
      }
      onSubmit={handleSubmit}
    />
  );
};

export default ActionForm;

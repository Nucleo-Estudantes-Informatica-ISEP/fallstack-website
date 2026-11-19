"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import { useUiText } from "@/contexts/UiLanguageContext";
import AdminForm, {
  type AdminFormSection,
  type AdminFormValue,
} from "@/components/AdminForm";
import type { AdminAccountDto } from "@/application/dto/adminAccountDto";

interface AdminAccountFormProps {
  admin?: AdminAccountDto;
}

const roleOptions = [
  { label: "Admin", value: "ADMIN" },
  { label: "Super Admin", value: "SUPER_ADMIN" },
];

const AdminAccountForm: React.FC<AdminAccountFormProps> = ({ admin }) => {
  const t = useUiText();

  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    try {
      if (admin) {
        const payload: Record<string, AdminFormValue | null | undefined> = {
          name: values.name,
          adminRole: values.adminRole,
        };
        await httpClient.patch(`/admin/admins/${admin.id}`, payload);
        toast.success(t("Admin atualizado."));
      } else {
        await httpClient.post("/admin/admins", {
          email: values.email,
          name: values.name,
          adminRole: values.adminRole,
        });
        toast.success(t("Admin criado."));
      }
      router.push("/admins");
      router.refresh();
    } catch {
      toast.error(t("Não foi possível guardar o admin."));
    }
  };

  const sections: AdminFormSection[] = [
    {
      kind: "fields",
      title: t("Detalhes"),
      fields: [
        ...(!admin
          ? ([
              {
                kind: "email",
                name: "email",
                label: "Email",
                required: true,
              },
            ] as const)
          : []),
        { kind: "text", name: "name", label: t("Nome"), required: true },
        {
          kind: "select",
          name: "adminRole",
          label: t("Tipo"),
          options: roleOptions,
          required: true,
        },
      ],
    },
  ];

  return (
    <AdminForm
      cancelHref="/admins"
      id={admin?.id}
      sections={sections}
      defaultValues={
        admin
          ? { name: admin.name, adminRole: admin.adminRole }
          : { adminRole: "ADMIN" }
      }
      onSubmit={handleSubmit}
    />
  );
};

export default AdminAccountForm;

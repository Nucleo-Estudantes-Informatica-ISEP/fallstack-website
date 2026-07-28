"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
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
  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    try {
      if (admin) {
        const payload: Record<string, AdminFormValue | null | undefined> = {
          name: values.name,
          adminRole: values.adminRole,
        };
        if (values.password) payload.password = values.password;
        await httpClient.patch(`/admin/admins/${admin.id}`, payload);
        toast.success("Admin atualizado.");
      } else {
        await httpClient.post("/admin/admins", {
          email: values.email,
          password: values.password,
          name: values.name,
          adminRole: values.adminRole,
        });
        toast.success("Admin criado.");
      }
      router.push("/admins");
      router.refresh();
    } catch {
      toast.error("Não foi possível guardar o admin.");
    }
  };

  const sections: AdminFormSection[] = [
    {
      kind: "fields",
      title: "Detalhes",
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
        { kind: "text", name: "name", label: "Nome", required: true },
        {
          kind: "select",
          name: "adminRole",
          label: "Tipo",
          options: roleOptions,
          required: true,
        },
      ],
    },
    {
      kind: "password",
      title: admin ? "Alterar palavra-passe" : "Palavra-passe",
      name: "password",
    },
  ];

  return (
    <AdminForm
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

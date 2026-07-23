"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import AdminForm, {
  type AdminFormSection,
  type AdminFormValue,
} from "@/components/AdminForm";
import type { AdminEmployeeDto } from "@/application/dto/employeeDto";

interface EmployeeFormProps {
  employee?: AdminEmployeeDto;
  companyOptions: { label: string; value: string }[];
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee,
  companyOptions,
}) => {
  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    try {
      if (employee) {
        const payload: Record<string, AdminFormValue | null | undefined> = {
          name: values.name,
          linkedin: values.linkedin || null,
          companyId: values.companyId,
        };
        if (values.password) payload.password = values.password;
        await httpClient.patch(`/admin/employees/${employee.id}`, payload);
        toast.success("Recrutador atualizado.");
      } else {
        await httpClient.post("/admin/employees", {
          email: values.email,
          password: values.password,
          name: values.name,
          companyId: values.companyId,
          linkedin: values.linkedin || undefined,
        });
        toast.success("Recrutador criado.");
      }
      router.push("/employees");
      router.refresh();
    } catch {
      toast.error("Não foi possível guardar o recrutador.");
    }
  };

  const sections: AdminFormSection[] = [
    {
      kind: "fields",
      title: "Detalhes",
      fields: [
        ...(!employee
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
          name: "companyId",
          label: "Empresa",
          options: companyOptions,
          required: true,
        },
        { kind: "text", name: "linkedin", label: "LinkedIn" },
      ],
    },
    {
      kind: "password",
      title: employee ? "Alterar palavra-passe" : "Palavra-passe",
      name: "password",
    },
  ];

  return (
    <AdminForm
      id={employee?.id}
      sections={sections}
      defaultValues={
        employee
          ? {
              name: employee.name,
              linkedin: employee.linkedin ?? "",
              companyId: employee.companyId,
            }
          : {}
      }
      onSubmit={handleSubmit}
    />
  );
};

export default EmployeeForm;

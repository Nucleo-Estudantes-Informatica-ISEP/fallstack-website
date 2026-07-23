"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import AdminForm, {
  type AdminFormSection,
  type AdminFormValue,
} from "@/components/AdminForm";
import type { AdminStudentDto } from "@/application/dto/studentDto";
import { STUDENT_YEAR } from "@/domain/student/year";

interface StudentFormProps {
  student?: AdminStudentDto;
}

const YEAR_OPTIONS = Object.entries(STUDENT_YEAR).map(([value, label]) => ({
  value,
  label,
}));

const StudentForm: React.FC<StudentFormProps> = ({ student }) => {
  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    try {
      if (student) {
        const payload: Record<string, AdminFormValue | null | undefined> = {
          name: values.name,
          bio: values.bio || null,
          year: values.year,
          linkedin: values.linkedin || null,
          github: values.github || null,
        };
        if (values.avatar) payload.avatar = values.avatar;
        if (values.password) payload.password = values.password;
        await httpClient.patch(`/admin/students/${student.id}`, payload);
        toast.success("Estudante atualizado.");
      } else {
        await httpClient.post("/admin/students", {
          email: values.email,
          password: values.password,
          code: values.code,
          name: values.name,
          year: values.year,
          bio: values.bio || undefined,
        });
        toast.success("Estudante criado.");
      }
      router.push("/students");
      router.refresh();
    } catch {
      toast.error("Não foi possível guardar o estudante.");
    }
  };

  const sections: AdminFormSection[] = [
    ...(student
      ? ([
          {
            kind: "image",
            title: "Foto de perfil",
            name: "avatar",
            currentUrl: student.avatar ?? undefined,
          },
        ] as AdminFormSection[])
      : []),
    {
      kind: "fields",
      title: "Detalhes",
      fields: [
        ...(!student
          ? ([
              {
                kind: "email",
                name: "email",
                label: "Email",
                required: true,
              },
              { kind: "text", name: "code", label: "Código", required: true },
            ] as const)
          : []),
        { kind: "text", name: "name", label: "Nome", required: true },
        {
          kind: "select",
          name: "year",
          label: "Ano",
          options: YEAR_OPTIONS,
          required: true,
        },
        { kind: "text", name: "bio", label: "Bio" },
        // linkedin/github aren't part of initial creation (matching the
        // self-signup flow) - only shown once a Student row exists to edit.
        ...(student
          ? ([
              { kind: "text", name: "linkedin", label: "LinkedIn" },
              { kind: "text", name: "github", label: "GitHub" },
            ] as const)
          : []),
      ],
    },
    {
      kind: "password",
      title: student ? "Alterar palavra-passe" : "Palavra-passe",
      name: "password",
    },
  ];

  return (
    <AdminForm
      id={student?.id}
      sections={sections}
      defaultValues={
        student
          ? {
              name: student.name,
              bio: student.bio ?? "",
              year: student.yearKey,
              linkedin: student.linkedin ?? "",
              github: student.github ?? "",
            }
          : { year: "LICENCIATURA_1" }
      }
      onSubmit={handleSubmit}
    />
  );
};

export default StudentForm;

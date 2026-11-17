"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import { useUiText } from "@/contexts/UiLanguageContext";
import AdminForm, {
  type AdminFormSection,
  type AdminFormValue,
} from "@/components/AdminForm";
import type { AdminStudentDto } from "@/application/dto/studentDto";
import { STUDENT_YEAR } from "@/domain/student/year";

import { linkedinPatch } from "./linkedinPatch";

interface StudentFormProps {
  student?: AdminStudentDto;
}

const YEAR_OPTIONS = Object.entries(STUDENT_YEAR).map(([value, label]) => ({
  value,
  label,
}));

const StudentForm: React.FC<StudentFormProps> = ({ student }) => {
  const t = useUiText();

  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    try {
      if (student) {
        const payload: Record<string, AdminFormValue | null | undefined> = {
          name: values.name,
          bio: values.bio || null,
          year: values.year,
          github: values.github || null,
          ...linkedinPatch(values.linkedin, student.linkedin),
        };
        if (values.avatar) payload.avatar = values.avatar;
        await httpClient.patch(`/admin/students/${student.id}`, payload);
        toast.success(t("Estudante atualizado."));
      } else {
        await httpClient.post("/admin/students", {
          email: values.email,
          code: values.code,
          name: values.name,
          year: values.year,
          bio: values.bio || undefined,
        });
        toast.success(t("Estudante criado."));
      }
      router.push("/students");
      router.refresh();
    } catch {
      toast.error(t("Não foi possível guardar o estudante."));
    }
  };

  const sections: AdminFormSection[] = [
    ...(student
      ? ([
          {
            kind: "image",
            title: "Foto de perfil",
            name: "avatar",
            uploadKind: "avatar",
            currentUrl: student.avatar ?? undefined,
          },
        ] as AdminFormSection[])
      : []),
    {
      kind: "fields",
      title: t("Detalhes"),
      fields: [
        ...(!student
          ? ([
              {
                kind: "email",
                name: "email",
                label: "Email",
                required: true,
              },
              {
                kind: "text",
                name: "code",
                label: t("Código"),
                required: true,
              },
            ] as const)
          : []),
        { kind: "text", name: "name", label: t("Nome"), required: true },
        {
          kind: "select",
          name: "year",
          label: t("Ano"),
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
  ];

  return (
    <AdminForm
      cancelHref="/students"
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

import { notFound } from "next/navigation";

import StudentForm from "@/components/StudentForm";
import { toAdminStudentDto } from "@/application/dto/studentDto";
import { getStudentById } from "@/application/services/studentService";
import { getUiText } from "@/application/services/uiLanguageService";

interface EditStudentPageProps {
  params: Promise<{ id: string }>;
}

const EditStudentPage = async ({ params }: EditStudentPageProps) => {
  const t = await getUiText();

  const { id } = await params;
  const student = await getStudentById(id);
  if (!student) notFound();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">
        {t("Editar estudante")}
      </h1>
      <StudentForm
        student={{
          ...toAdminStudentDto(student),
          linkedin: student.linkedin,
          github: student.github,
        }}
      />
    </section>
  );
};

export default EditStudentPage;

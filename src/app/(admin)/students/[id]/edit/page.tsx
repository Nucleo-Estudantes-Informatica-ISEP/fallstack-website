import { notFound } from "next/navigation";

import StudentForm from "@/components/StudentForm";
import { toAdminStudentDto } from "@/application/dto/studentDto";
import { getStudentById } from "@/application/services/studentService";

interface EditStudentPageProps {
  params: Promise<{ id: string }>;
}

const EditStudentPage = async ({ params }: EditStudentPageProps) => {
  const { id } = await params;
  const student = await getStudentById(id);
  if (!student) notFound();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Editar estudante</h1>
      <StudentForm student={toAdminStudentDto(student)} />
    </section>
  );
};

export default EditStudentPage;

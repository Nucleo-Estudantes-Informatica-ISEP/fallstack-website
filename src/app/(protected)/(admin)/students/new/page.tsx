import StudentForm from "@/components/StudentForm";

const NewStudentPage = () => (
  <section className="flex flex-col gap-6 p-8">
    <h1 className="text-2xl font-bold text-gray-800">Adicionar estudante</h1>
    <StudentForm />
  </section>
);

export default NewStudentPage;

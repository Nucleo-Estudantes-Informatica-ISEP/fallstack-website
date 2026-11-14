import ScheduleForm from "@/components/ScheduleForm";

const NewScheduleEventPage = () => (
  <section className="flex flex-col gap-6 p-8">
    <h1 className="text-2xl font-bold text-gray-800">Adicionar atividade</h1>
    <ScheduleForm />
  </section>
);

export default NewScheduleEventPage;

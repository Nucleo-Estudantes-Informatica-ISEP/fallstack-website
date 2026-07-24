import { notFound } from "next/navigation";

import ScheduleForm from "@/components/ScheduleForm";
import { toScheduleEventDto } from "@/application/dto/scheduleDto";
import { getScheduleEvent } from "@/application/services/scheduleService";

interface EditScheduleEventPageProps {
  params: Promise<{ id: string }>;
}

const EditScheduleEventPage = async ({
  params,
}: EditScheduleEventPageProps) => {
  const { id } = await params;
  const event = await getScheduleEvent(id);
  if (!event) notFound();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Editar atividade</h1>
      <ScheduleForm event={toScheduleEventDto(event)} />
    </section>
  );
};

export default EditScheduleEventPage;

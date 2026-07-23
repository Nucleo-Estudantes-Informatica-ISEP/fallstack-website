import ScheduleBoard from "@/components/ScheduleBoard";
import { getScheduleEvents } from "@/application/services/scheduleService";

const ScheduleOrderPage = async () => {
  const events = await getScheduleEvents();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Ordenar programa</h1>
      <p className="max-w-2xl text-sm text-gray-500">
        Arrasta as atividades para reordenar dentro de um dia ou mover entre
        dias. Uma atividade cujo início fica antes do fim da anterior é marcada
        a vermelho e impede guardar até ser corrigida.
      </p>
      <ScheduleBoard
        events={events.map((event) => ({
          id: event.id,
          day: event.day,
          startTime: event.startTime,
          endTime: event.endTime,
          activity: event.activity,
        }))}
      />
    </section>
  );
};

export default ScheduleOrderPage;

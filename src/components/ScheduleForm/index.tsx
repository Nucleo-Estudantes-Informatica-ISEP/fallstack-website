"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import type { ScheduleEventDto } from "@/application/dto/scheduleDto";

interface ScheduleFormProps {
  event?: ScheduleEventDto;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({ event }) => {
  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const payload = {
      day: values.day,
      startTime: values.startTime,
      endTime: values.endTime,
      activity: values.activity,
    };

    try {
      if (event) {
        await httpClient.patch(`/admin/schedule/${event.id}`, payload);
        toast.success("Atividade atualizada.");
      } else {
        await httpClient.post("/admin/schedule", payload);
        toast.success("Atividade criada.");
      }
      router.push("/schedule");
      router.refresh();
    } catch {
      toast.error("Não foi possível guardar a atividade.");
    }
  };

  return (
    <AdminForm
      id={event?.id}
      sections={[
        {
          kind: "fields",
          title: "Detalhes",
          fields: [
            { kind: "number", name: "day", label: "Dia", required: true },
            {
              kind: "time",
              name: "startTime",
              label: "Início",
              required: true,
            },
            {
              kind: "time",
              name: "endTime",
              label: "Fim",
              required: true,
            },
            {
              kind: "text",
              name: "activity",
              label: "Atividade",
              required: true,
            },
          ],
        },
      ]}
      defaultValues={
        event
          ? {
              day: event.day,
              startTime: event.startTime,
              endTime: event.endTime,
              activity: event.activity,
            }
          : { day: 1 }
      }
      onSubmit={handleSubmit}
    />
  );
};

export default ScheduleForm;

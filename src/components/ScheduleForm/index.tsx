"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient, HttpClientError } from "@/lib/http/client";
import { useUiText } from "@/contexts/UiLanguageContext";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import type { AdminScheduleEventDto } from "@/application/dto/scheduleDto";

interface ScheduleFormProps {
  event?: AdminScheduleEventDto;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({ event }) => {
  const t = useUiText();

  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const payload = {
      day: values.day,
      startTime: values.startTime,
      endTime: values.endTime,
      activity: { PT: values.activityPT, EN: values.activityEN },
    };

    try {
      if (event) {
        await httpClient.patch(`/admin/schedule/${event.id}`, payload);
        toast.success(t("Atividade atualizada."));
      } else {
        await httpClient.post("/admin/schedule", payload);
        toast.success(t("Atividade criada."));
      }
      router.push("/schedule");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof HttpClientError
          ? error.message
          : t("Não foi possível guardar a atividade.")
      );
    }
  };

  return (
    <AdminForm
      cancelHref="/schedule"
      id={event?.id}
      sections={[
        {
          kind: "fields",
          title: t("Detalhes"),
          fields: [
            { kind: "number", name: "day", label: t("Dia"), required: true },
            {
              kind: "time",
              name: "startTime",
              label: t("Início"),
              required: true,
            },
            {
              kind: "time",
              name: "endTime",
              label: t("Fim"),
              required: true,
            },
            {
              kind: "text",
              name: "activityPT",
              label: t("Atividade (PT)"),
              required: true,
            },
            {
              kind: "text",
              name: "activityEN",
              label: t("Atividade (EN)"),
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
              activityPT: event.activity.PT,
              activityEN: event.activity.EN,
            }
          : { day: 1 }
      }
      onSubmit={handleSubmit}
    />
  );
};

export default ScheduleForm;

"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient, HttpClientError } from "@/lib/http/client";
import { useUiText } from "@/contexts/UiLanguageContext";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import type { AdminFaqDto } from "@/application/dto/faqDto";

interface FaqFormProps {
  faq?: AdminFaqDto;
}

const FaqForm: React.FC<FaqFormProps> = ({ faq }) => {
  const t = useUiText();

  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const payload = {
      question: { PT: values.questionPT, EN: values.questionEN },
      answer: { PT: values.answerPT, EN: values.answerEN },
    };

    try {
      if (faq) {
        await httpClient.patch(`/admin/faqs/${faq.id}`, payload);
        toast.success(t("Pergunta atualizada."));
      } else {
        await httpClient.post("/admin/faqs", payload);
        toast.success(t("Pergunta criada."));
      }
      router.push("/faqs");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof HttpClientError
          ? error.message
          : t("Não foi possível guardar a pergunta.")
      );
    }
  };

  return (
    <AdminForm
      cancelHref="/faqs"
      id={faq?.id}
      sections={[
        {
          kind: "fields",
          title: t("Detalhes"),
          fields: [
            {
              kind: "text",
              name: "questionPT",
              label: t("Pergunta (PT)"),
              required: true,
            },
            {
              kind: "textarea",
              name: "answerPT",
              label: t("Resposta (PT)"),
              required: true,
              rows: 6,
            },
            {
              kind: "text",
              name: "questionEN",
              label: t("Pergunta (EN)"),
              required: true,
            },
            {
              kind: "textarea",
              name: "answerEN",
              label: t("Resposta (EN)"),
              required: true,
              rows: 6,
            },
          ],
        },
      ]}
      defaultValues={
        faq
          ? {
              questionPT: faq.question.PT,
              answerPT: faq.answer.PT,
              questionEN: faq.question.EN,
              answerEN: faq.answer.EN,
            }
          : {}
      }
      onSubmit={handleSubmit}
    />
  );
};

export default FaqForm;

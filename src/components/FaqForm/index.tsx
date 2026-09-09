"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient, HttpClientError } from "@/lib/http/client";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import type { AdminFaqDto } from "@/application/dto/faqDto";

interface FaqFormProps {
  faq?: AdminFaqDto;
}

const FaqForm: React.FC<FaqFormProps> = ({ faq }) => {
  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const payload = {
      question: { PT: values.questionPT, EN: values.questionEN },
      answer: { PT: values.answerPT, EN: values.answerEN },
    };

    try {
      if (faq) {
        await httpClient.patch(`/admin/faqs/${faq.id}`, payload);
        toast.success("Pergunta atualizada.");
      } else {
        await httpClient.post("/admin/faqs", payload);
        toast.success("Pergunta criada.");
      }
      router.push("/faqs");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof HttpClientError
          ? error.message
          : "Não foi possível guardar a pergunta."
      );
    }
  };

  return (
    <AdminForm
      id={faq?.id}
      sections={[
        {
          kind: "fields",
          title: "Detalhes",
          fields: [
            {
              kind: "text",
              name: "questionPT",
              label: "Pergunta (PT)",
              required: true,
            },
            {
              kind: "textarea",
              name: "answerPT",
              label: "Resposta (PT)",
              required: true,
              rows: 6,
            },
            {
              kind: "text",
              name: "questionEN",
              label: "Pergunta (EN)",
              required: true,
            },
            {
              kind: "textarea",
              name: "answerEN",
              label: "Resposta (EN)",
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

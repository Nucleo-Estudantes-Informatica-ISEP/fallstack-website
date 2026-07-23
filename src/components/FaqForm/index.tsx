"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import type { FaqDto } from "@/application/dto/faqDto";

interface FaqFormProps {
  faq?: FaqDto;
}

const FaqForm: React.FC<FaqFormProps> = ({ faq }) => {
  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const payload = {
      question: values.question,
      answer: values.answer,
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
    } catch {
      toast.error("Não foi possível guardar a pergunta.");
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
              name: "question",
              label: "Pergunta",
              required: true,
            },
            {
              kind: "textarea",
              name: "answer",
              label: "Resposta",
              required: true,
              rows: 6,
            },
          ],
        },
      ]}
      defaultValues={faq ? { question: faq.question, answer: faq.answer } : {}}
      onSubmit={handleSubmit}
    />
  );
};

export default FaqForm;

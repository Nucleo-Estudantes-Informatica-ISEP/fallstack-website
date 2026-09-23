"use client";

import { FunctionComponent, useEffect, useState } from "react";

import { httpClient } from "@/lib/http/client";
import HeadingText from "@/components/ui/HeadingText";
import FaqContainer from "@/components/Faq/FaqContainer";
import type { FaqDto } from "@/application/dto/faqDto";
import type { Language } from "@/domain/i18n/translations";

interface FaqSectionProps {
  language: Language;
}

const FaqSection: FunctionComponent<FaqSectionProps> = ({ language }) => {
  const [faqs, setFaqs] = useState<FaqDto[] | null>(null);

  useEffect(() => {
    httpClient
      .get<FaqDto[]>(`/faqs?lang=${language}`)
      .then(setFaqs)
      .catch(() => setFaqs([]));
  }, [language]);

  if (!faqs) return null;

  return (
    <section className="w-full bg-background pb-16">
      <div className="mx-auto flex w-full flex-col gap-10">
        <HeadingText
          text="FAQs"
          className="mb-0! text-left! text-4xl text-secondary md:text-5xl!"
        />
        <FaqContainer
          faqs={faqs.map((faq, index) => ({
            question: faq.question,
            answer: faq.answer,
            index,
          }))}
        />
      </div>
    </section>
  );
};

export default FaqSection;

export interface FaqDto {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export const toFaqDto = (faq: FaqDto): FaqDto => ({
  id: faq.id,
  question: faq.question,
  answer: faq.answer,
  order: faq.order,
});

import FaqBoard from "@/components/FaqBoard";
import { getFaqEntries } from "@/application/services/faqService";

const FaqOrderPage = async () => {
  const faqs = await getFaqEntries();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Ordenar FAQs</h1>
      <FaqBoard
        faqs={faqs.map((faq) => ({ id: faq.id, question: faq.question }))}
      />
    </section>
  );
};

export default FaqOrderPage;

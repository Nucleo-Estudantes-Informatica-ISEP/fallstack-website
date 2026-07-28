import FaqForm from "@/components/FaqForm";

const NewFaqPage = () => (
  <section className="flex flex-col gap-6 p-8">
    <h1 className="text-2xl font-bold text-gray-800">Adicionar pergunta</h1>
    <FaqForm />
  </section>
);

export default NewFaqPage;

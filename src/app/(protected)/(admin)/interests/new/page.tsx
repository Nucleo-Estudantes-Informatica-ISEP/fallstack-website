import UiText from "@/components/ui/UiText";
import InterestForm from "@/components/InterestForm";

const NewInterestPage = () => (
  <section className="flex flex-col gap-6 p-8">
    <h1 className="text-2xl font-bold text-gray-800">
      <UiText text="Adicionar interesse" />
    </h1>
    <InterestForm />
  </section>
);

export default NewInterestPage;

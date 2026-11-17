import UiText from "@/components/ui/UiText";
import SponsorForm from "@/components/SponsorForm";

const NewSponsorPage = () => (
  <section className="flex flex-col gap-6 p-8">
    <h1 className="text-2xl font-bold text-gray-800">
      <UiText text="Adicionar patrocinador" />
    </h1>
    <SponsorForm />
  </section>
);

export default NewSponsorPage;

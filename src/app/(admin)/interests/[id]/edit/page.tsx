import { notFound } from "next/navigation";

import InterestForm from "@/components/InterestForm";
import { toInterestDto } from "@/application/dto/interestDto";
import { getInterest } from "@/application/services/interestService";

interface EditInterestPageProps {
  params: Promise<{ id: string }>;
}

const EditInterestPage = async ({ params }: EditInterestPageProps) => {
  const { id } = await params;
  const interest = await getInterest(id);
  if (!interest) notFound();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Editar interesse</h1>
      <InterestForm interest={toInterestDto(interest)} />
    </section>
  );
};

export default EditInterestPage;

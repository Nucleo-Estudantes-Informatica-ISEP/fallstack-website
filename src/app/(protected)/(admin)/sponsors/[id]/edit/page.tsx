import { notFound } from "next/navigation";

import SponsorForm from "@/components/SponsorForm";
import { toAdminSponsorDto } from "@/application/dto/sponsorDto";
import { getSponsor } from "@/application/services/sponsorService";
import { getUiText } from "@/application/services/uiLanguageService";

interface EditSponsorPageProps {
  params: Promise<{ id: string }>;
}

const EditSponsorPage = async ({ params }: EditSponsorPageProps) => {
  const t = await getUiText();

  const { id } = await params;
  const sponsor = await getSponsor(id);
  if (!sponsor) notFound();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">
        {t("Editar patrocinador")}
      </h1>
      <SponsorForm
        sponsor={{ ...toAdminSponsorDto(sponsor), website: sponsor.website }}
      />
    </section>
  );
};

export default EditSponsorPage;

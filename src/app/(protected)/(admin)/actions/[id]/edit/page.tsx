import { notFound } from "next/navigation";

import ActionForm from "@/components/ActionForm";
import { toAdminActionDto } from "@/application/dto/actionDto";
import { getAction } from "@/application/services/actionService";
import { getCompanies } from "@/application/services/companyService";

interface EditActionPageProps {
  params: Promise<{ id: string }>;
}

const EditActionPage = async ({ params }: EditActionPageProps) => {
  const { id } = await params;
  const [action, companies] = await Promise.all([
    getAction(id),
    getCompanies(),
  ]);
  if (!action) notFound();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Editar ação</h1>
      <ActionForm action={toAdminActionDto(action)} companies={companies} />
    </section>
  );
};

export default EditActionPage;

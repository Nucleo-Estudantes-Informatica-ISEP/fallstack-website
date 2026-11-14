import { notFound } from "next/navigation";

import AdminAccountForm from "@/components/AdminAccountForm";
import { toAdminAccountDto } from "@/application/dto/adminAccountDto";
import { getAdminAccountById } from "@/application/services/adminAccountService";
import getServerSession from "@/application/services/sessionService";

interface EditAdminPageProps {
  params: Promise<{ id: string }>;
}

const EditAdminPage = async ({ params }: EditAdminPageProps) => {
  const session = await getServerSession();
  if (!session || session.adminRole !== "SUPER_ADMIN") notFound();

  const { id } = await params;
  const admin = await getAdminAccountById(id);
  if (!admin) notFound();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Editar admin</h1>
      <AdminAccountForm admin={toAdminAccountDto(admin)} />
    </section>
  );
};

export default EditAdminPage;

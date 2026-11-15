import { notFound } from "next/navigation";

import AdminAccountForm from "@/components/AdminAccountForm";
import getServerSession from "@/application/services/sessionService";

const NewAdminPage = async () => {
  const session = await getServerSession();
  if (!session || session.adminRole !== "SUPER_ADMIN") notFound();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Adicionar admin</h1>
      <AdminAccountForm />
    </section>
  );
};

export default NewAdminPage;

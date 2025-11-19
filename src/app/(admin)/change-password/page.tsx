import React from "react";

import getServerSession from "@/services/getServerSession";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import Custom404 from "@/app/not-found";

const changePassword = async () => {
  const session = await getServerSession();

  if (!session || !session.isAdmin) {
    return Custom404();
  }

  return (
    <section className="flex min-h-screen w-full flex-col items-center justify-center px-8 py-24 md:px-24">
      <h1 className="mb-8 text-3xl font-bold">Change Password</h1>
      <ChangePasswordForm />
    </section>
  );
};

export default changePassword;

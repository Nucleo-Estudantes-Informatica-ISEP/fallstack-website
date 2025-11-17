import React from "react";

import { getStudentsForGiveaway } from "@/lib/students";
import getServerSession from "@/services/getServerSession";
import GiveawaySection from "@/components/GiveawaySection";
import Custom404 from "@/app/not-found";

const giveaway = async () => {
  const session = await getServerSession();

  if (!session || !session.isAdmin) {
    return Custom404();
  }

  const students = await getStudentsForGiveaway();

  const tableRows = 10;
  const numberOfRandomizedStudents = 50;

  return (
    <section className="flex min-h-screen w-full flex-col items-center justify-center px-8 py-24 md:px-24">
      <GiveawaySection
        students={students}
        tableRows={tableRows}
        numberOfRandomizedStudents={numberOfRandomizedStudents}
      />
    </section>
  );
};

export default giveaway;

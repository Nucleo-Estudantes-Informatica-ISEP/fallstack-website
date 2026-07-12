import { HttpError } from "@/types/HttpError";
import { getCompanyStats } from "@/lib/fetchStats";
import getCompanyHistory from "@/lib/getCompanyHistory";
import prisma from "@/lib/prisma";
import { getStudents } from "@/lib/students";
import getServerSession from "@/services/getServerSession";
import CompanyProfileSectionContainer from "@/components/Companies/CompanyProfile/CompanyProfileSectionContainer";
import Custom404 from "@/app/not-found";

const Dashboard = async () => {
  const session = await getServerSession();
  if (!session || !session.employee?.company) return Custom404();

  const globalStats = await getCompanyStats(session.employee.company.id);

  const students = await getStudents();
  const totalStudents = students.length;

  const history = await getCompanyHistory();

  // Interests are synced across all company employees, so a single source is enough
  const referenceEmployee = await prisma.employee.findFirst({
    where: { companyId: session.employee.company.id },
    include: {
      user: {
        include: { interests: true },
      },
    },
  });

  const companyInterests =
    referenceEmployee?.user.interests.map((interest) => interest.name) ?? [];

  return (
    <section
      className={`bg-company flex size-full min-h-screen flex-col items-center`}
    >
      <CompanyProfileSectionContainer
        company={session.employee.company}
        employeeName={session.employee.name}
        globalStats={globalStats}
        totalStudents={totalStudents}
        history={history instanceof HttpError ? [] : history}
        interests={companyInterests}
      />
    </section>
  );
};

export default Dashboard;

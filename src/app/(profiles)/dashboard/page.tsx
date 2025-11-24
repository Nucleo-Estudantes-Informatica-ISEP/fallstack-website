import { HttpError } from "@/types/HttpError";
import { getCompanyStats } from "@/lib/fetchStats";
import getCompanyHistory from "@/lib/getCompanyHistory";
import { getStudents } from "@/lib/students";
import prisma from "@/lib/prisma";
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

  // Get all employees in the company and merge their interests
  const companyEmployees = await prisma.employee.findMany({
    where: { companyId: session.employee.company.id },
    include: {
      user: {
        include: {
          interests: true,
        },
      },
    },
  });

  // Merge interests from all employees (use Set to get unique interests)
  const mergedInterests: string[] = Array.from(
    new Set(
      companyEmployees.flatMap((employee) =>
        employee.user.interests.map((interest: { name: string }) => interest.name)
      )
    )
  );

  return (
    <section
      className={`flex size-full min-h-screen flex-col items-center bg-company`}
    >
      <CompanyProfileSectionContainer
        company={session.employee.company}
        employeeName={session.employee.name}
        globalStats={globalStats}
        totalStudents={totalStudents}
        history={history instanceof HttpError ? [] : history}
        interests={mergedInterests}
      />
    </section>
  );
};

export default Dashboard;

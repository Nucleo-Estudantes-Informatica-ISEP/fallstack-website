import { HttpError } from "@/types/HttpError";
import CompanyProfileSectionContainer from "@/components/Companies/CompanyProfile/CompanyProfileSectionContainer";
import Custom404 from "@/app/not-found";
import { toCompanyDto } from "@/application/dto/companyDto";
import { toSavedStudentDto } from "@/application/dto/historyDto";
import { toInterestDto } from "@/application/dto/interestDto";
import { getCompanyInterests } from "@/application/services/companyService";
import { getInterests } from "@/application/services/interestService";
import {
  getCompanyHistory,
  getCompanyStats,
} from "@/application/services/savedStudentService";
import getServerSession from "@/application/services/sessionService";
import { getStudents } from "@/application/services/studentService";

const Dashboard = async () => {
  const session = await getServerSession();
  if (!session || !session.employee?.company) return Custom404();

  const [globalStats, students, history, companyInterests, interests] =
    await Promise.all([
      getCompanyStats(session.employee.company.id),
      getStudents(),
      getCompanyHistory(session.employee.company.id),
      getCompanyInterests(session.employee.company.id),
      getInterests(),
    ]);

  return (
    <section
      className={`bg-company flex size-full min-h-screen flex-col items-center`}
    >
      <CompanyProfileSectionContainer
        company={toCompanyDto(session.employee.company)}
        employeeName={session.employee.name}
        globalStats={globalStats}
        totalStudents={students.length}
        history={
          history instanceof HttpError ? [] : history.map(toSavedStudentDto)
        }
        interests={companyInterests}
        availableInterests={interests.map(toInterestDto)}
      />
    </section>
  );
};

export default Dashboard;

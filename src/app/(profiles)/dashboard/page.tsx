import { HttpError } from "@/types/HttpError";
import CompanyProfileSectionContainer from "@/components/Companies/CompanyProfile/CompanyProfileSectionContainer";
import Custom404 from "@/app/not-found";
import { toCompanyDto } from "@/application/dto/companyDto";
import { toSavedStudentDto } from "@/application/dto/historyDto";
import { getCompanyInterests } from "@/application/services/companyService";
import {
  getCompanyHistory,
  getCompanyStats,
} from "@/application/services/savedStudentService";
import getServerSession from "@/application/services/sessionService";
import { getStudents } from "@/application/services/studentService";

const Dashboard = async () => {
  const session = await getServerSession();
  if (!session || !session.employee?.company) return Custom404();

  const globalStats = await getCompanyStats(session.employee.company.id);

  const students = await getStudents();
  const totalStudents = students.length;

  const history = await getCompanyHistory(session.employee.company.id);
  const companyInterests = await getCompanyInterests(
    session.employee.company.id
  );

  return (
    <section
      className={`bg-company flex size-full min-h-screen flex-col items-center`}
    >
      <CompanyProfileSectionContainer
        company={toCompanyDto(session.employee.company)}
        employeeName={session.employee.name}
        globalStats={globalStats}
        totalStudents={totalStudents}
        history={
          history instanceof HttpError ? [] : history.map(toSavedStudentDto)
        }
        interests={companyInterests}
      />
    </section>
  );
};

export default Dashboard;

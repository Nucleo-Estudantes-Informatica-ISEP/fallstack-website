import { headers } from "next/headers";

import { HttpError } from "@/types/HttpError";
import CompanyProfileSectionContainer from "@/components/Companies/CompanyProfile/CompanyProfileSectionContainer";
import Custom404 from "@/app/not-found";
import { toCompanyDto } from "@/application/dto/companyDto";
import { toSavedStudentDto } from "@/application/dto/historyDto";
import { toInterestDto } from "@/application/dto/interestDto";
import { getCompanyInterestIds } from "@/application/services/companyService";
import { getInterests } from "@/application/services/interestService";
import {
  getCompanyHistory,
  getCompanyStats,
} from "@/application/services/savedStudentService";
import getServerSession from "@/application/services/sessionService";
import { getStudents } from "@/application/services/studentService";
import { resolveLanguage } from "@/domain/i18n/translations";

const Dashboard = async () => {
  const session = await getServerSession();
  if (!session || !session.employee?.company) return Custom404();
  const language = resolveLanguage((await headers()).get("accept-language"));

  const [globalStats, students, history, companyInterestIds, interests] =
    await Promise.all([
      getCompanyStats(session.employee.company.id),
      getStudents(),
      getCompanyHistory(session.employee.company.id),
      getCompanyInterestIds(session.employee.company.id),
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
        interestIds={companyInterestIds}
        availableInterests={interests.map((interest) =>
          toInterestDto(interest, language)
        )}
      />
    </section>
  );
};

export default Dashboard;

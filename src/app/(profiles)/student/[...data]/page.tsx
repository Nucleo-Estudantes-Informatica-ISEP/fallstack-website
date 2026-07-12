import NeiLogoSimplifiedWhite from "~/public/assets/images/logo-simplified-white.png";

import { HttpError } from "@/types/HttpError";
import { getCompanies } from "@/lib/companies";
import { getStats, getTodayStats } from "@/lib/fetchStats";
import { fetchStudent } from "@/lib/fetchStudent";
import { fetchStudentActions } from "@/lib/fetchStudentActions";
import getStudentHistory from "@/lib/getStudentHistory";
import { isSaved } from "@/lib/savedStudents";
import { verifyJwt } from "@/services/authService";
import getServerSession from "@/services/getServerSession";
import CompanyViewProfileSectionContainer from "@/components/Companies/CompanyProfile/CompanyViewProfileSectionContainer";
import Footer from "@/components/Footer";
import PreviewProfileSectionContainer from "@/components/Profile/PreviewProfileSectionContainer";
import ProfileSectionContainer from "@/components/Profile/ProfileSectionContainer";
import PublicProfileSectionContainer from "@/components/Profile/PublicProfileSectionContainer";
import Custom404 from "@/app/not-found";

interface ProfileProps {
  params: Promise<{
    data: string[];
  }>;
}

const StudentPage = async (props: ProfileProps) => {
  const params = await props.params;
  const session = await getServerSession();

  if (!session) return Custom404();

  const {
    data: [code, preview],
  } = params;

  // if is preview, treat code as jwt for temp access
  const isPreview = preview === "preview";

  let student = null;
  let decodedPreviewCode: string | null = null;

  if (isPreview) {
    const token = verifyJwt(code);
    decodedPreviewCode = token ? (token as { code: string }).code : null;
    const targetCode = decodedPreviewCode ?? code;
    student = await fetchStudent(targetCode);
  } else {
    student = await fetchStudent(code);
  }

  if (!student) return Custom404();

  // companies may access if it's their own profile
  if (
    session.student &&
    !session.student.code.match(student.code) &&
    !isPreview
  )
    return Custom404();

  const isSavedStudent = session.employee
    ? await isSaved(session.employee.company.id, student.code)
    : false;

  // companies may access if they saved the profile
  if (session.employee && !isSavedStudent && !isPreview) return Custom404();

  const sanitizedInterests = student.user.interests.map((i) => i.name);

  const globalStats = await getStats(student.code);
  const todayStats = await getTodayStats(student.id);

  const companies = await getCompanies();

  const history = await getStudentHistory(student.code);
  const actions = await fetchStudentActions(student.code);

  const totalCompanies = companies.length;
  const uniqueCompaniesSaved =
    history instanceof HttpError
      ? 0
      : new Set(history.map((h) => h.savedBy.companyId)).size;

  const companiesLeft = totalCompanies - uniqueCompaniesSaved;

  if (isPreview && !decodedPreviewCode && session.employee && !isSavedStudent)
    return Custom404();

  if (isPreview) {
    return (
      <>
        <PreviewProfileSectionContainer
          student={student}
          interests={sanitizedInterests}
          token={code}
          isCompanyView={!!session.employee}
          isSavedStudent={isSavedStudent}
        />
        <Footer neiLogoSrc={NeiLogoSimplifiedWhite} />
      </>
    );
  }

  return (
    <>
      <section
        className={`${
          session && session.role === "EMPLOYEE" ? "bg-company" : "bg-inherit"
        } flex size-full min-h-screen flex-col items-center`}
      >
        {session && session.employee?.company && session.role === "EMPLOYEE" ? (
          <CompanyViewProfileSectionContainer
            interests={sanitizedInterests}
            student={student}
            company={session.employee.company}
            token={code}
            isSavedStudent={isSavedStudent}
          />
        ) : !session || session.student?.code !== code ? (
          <PublicProfileSectionContainer
            interests={sanitizedInterests}
            student={student}
          />
        ) : (
          <ProfileSectionContainer
            globalStats={globalStats}
            todayStats={todayStats}
            companiesLeft={companiesLeft}
            historyData={history instanceof HttpError ? [] : history}
            actions={actions}
            student={student}
            interests={sanitizedInterests}
          />
        )}
      </section>
      <Footer neiLogoSrc={NeiLogoSimplifiedWhite} />
    </>
  );
};

export default StudentPage;

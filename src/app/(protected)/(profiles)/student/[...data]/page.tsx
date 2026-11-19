import { cookies, headers } from "next/headers";
import NeiLogoSimplifiedWhite from "~/public/assets/images/logo-simplified-white.png";

import { HttpError } from "@/types/HttpError";
import CompanyViewProfileSectionContainer from "@/components/Companies/CompanyProfile/CompanyViewProfileSectionContainer";
import Footer from "@/components/Footer";
import PreviewProfileSectionContainer from "@/components/Profile/PreviewProfileSectionContainer";
import ProfileSectionContainer from "@/components/Profile/ProfileSectionContainer";
import PublicProfileSectionContainer from "@/components/Profile/PublicProfileSectionContainer";
import Custom404 from "@/app/not-found";
import { toStudentActionDto } from "@/application/dto/actionDto";
import { toSavedStudentDto } from "@/application/dto/historyDto";
import { toInterestDto } from "@/application/dto/interestDto";
import { toStudentDto } from "@/application/dto/studentDto";
import { getStudentActions } from "@/application/services/actionService";
import { getCompanies } from "@/application/services/companyService";
import { getInterests } from "@/application/services/interestService";
import {
  getStudentHistory,
  getStudentStats,
  getTodayStudentStats,
  isSaved,
} from "@/application/services/savedStudentService";
import getServerSession from "@/application/services/sessionService";
import { getStudent } from "@/application/services/studentService";
import {
  studentCodeFromPreview,
  studentPreviewCookieName,
} from "@/application/services/studentTokenService";
import {
  canAccessAttendanceScanner,
  passesAuthPolicy,
} from "@/domain/auth/authPolicy";
import { resolveRequestLanguage } from "@/domain/i18n/translations";

interface ProfileProps {
  params: Promise<{
    data: string[];
  }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}

const StudentPage = async (props: ProfileProps) => {
  const params = await props.params;
  const { lang } = await props.searchParams;
  const session = await getServerSession();
  const language = resolveRequestLanguage(
    lang,
    (await headers()).get("accept-language")
  );

  if (!session) return Custom404();

  const {
    data: [code, preview],
  } = params;

  const isPreview = preview === "preview";
  const companyId = passesAuthPolicy("employee", session)
    ? session.employee!.company.id
    : undefined;
  if (isPreview && !companyId) return Custom404();

  if (session.student && session.student.code !== code && !isPreview)
    return Custom404();

  const isSavedStudent = companyId ? await isSaved(companyId, code) : false;
  if (companyId && !isSavedStudent && !isPreview) return Custom404();

  let previewToken: string | undefined;
  if (isPreview && companyId && !isSavedStudent) {
    previewToken = (await cookies()).get(studentPreviewCookieName)?.value;
    if (studentCodeFromPreview(previewToken, companyId) !== code)
      return Custom404();
  }

  const student = await getStudent(code);
  if (!student) return Custom404();

  const studentInterests = student.interests.map(({ id, name }) => ({
    id,
    name: name[language],
  }));
  const localizedInterestNames = studentInterests.map(({ name }) => name);
  const isOwnProfile = !isPreview && session.student?.code === student.code;

  // Previews (a valid signed preview token, viewed before the company has
  // saved the student) intentionally bypass the "must be saved" check above,
  // but getStudentStats' ownership check would reject that same access -
  // and PreviewProfileSectionContainer never reads either stats value below
  // anyway, so skip both calls entirely for previews instead of failing.
  const [globalStats, todayStats, companies, history, actions, interests] =
    await Promise.all([
      isPreview
        ? Promise.resolve({ totalScans: 0, totalSaves: 0 })
        : getStudentStats(student.code, {
            studentCode: session.student?.code,
            companyId,
            isAdmin: session.adminRole !== null,
            // already computed above - avoids re-deriving the same isSaved
            // lookup a second time inside the ownership check
            isSaved: isSavedStudent,
          }),
      isPreview ? Promise.resolve(0) : getTodayStudentStats(student.id),
      getCompanies(),
      session.student
        ? getStudentHistory(session.student.id)
        : Promise.resolve(new HttpError("Forbidden", 403)),
      getStudentActions(student.code),
      isOwnProfile ? getInterests() : Promise.resolve([]),
    ]);
  const studentDto = toStudentDto(student);

  const totalCompanies = companies.length;
  const uniqueCompaniesSaved =
    history instanceof HttpError
      ? 0
      : new Set(history.map((h) => h.savedBy.companyId)).size;

  const companiesLeft = totalCompanies - uniqueCompaniesSaved;

  if (isPreview) {
    return (
      <>
        <PreviewProfileSectionContainer
          student={studentDto}
          interests={localizedInterestNames}
          token={previewToken}
          isCompanyView={!!companyId}
          isSavedStudent={isSavedStudent}
        />
        <Footer neiLogoSrc={NeiLogoSimplifiedWhite} />
      </>
    );
  }

  return (
    <>
      <section className="flex size-full min-h-screen flex-col items-center">
        {session && session.employee?.company && session.role === "EMPLOYEE" ? (
          <CompanyViewProfileSectionContainer
            interests={localizedInterestNames}
            student={studentDto}
          />
        ) : !session || session.student?.code !== code ? (
          <PublicProfileSectionContainer
            interests={localizedInterestNames}
            student={studentDto}
          />
        ) : (
          <ProfileSectionContainer
            globalStats={globalStats}
            todayStats={todayStats}
            companiesLeft={companiesLeft}
            historyData={
              history instanceof HttpError ? [] : history.map(toSavedStudentDto)
            }
            actions={actions.map(toStudentActionDto)}
            student={studentDto}
            interestIds={studentInterests.map(({ id }) => id)}
            availableInterests={interests.map((interest) =>
              toInterestDto(interest, language)
            )}
            canRecordAttendance={canAccessAttendanceScanner(session)}
          />
        )}
      </section>
      <Footer neiLogoSrc={NeiLogoSimplifiedWhite} />
    </>
  );
};

export default StudentPage;

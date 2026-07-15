import StudentSignUp from "@/components/StudentSignUp";
import { toInterestDto } from "@/application/dto/interestDto";
import { getInterests } from "@/application/services/interestService";

export const dynamic = "force-dynamic";

const SignUpPage = async () => {
  const interests = await getInterests();
  return <StudentSignUp interests={interests.map(toInterestDto)} />;
};

export default SignUpPage;

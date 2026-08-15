import LoginCard from "@/components/LoginCard";

interface LoginPageProps {
  // Only "employee" is meaningful here (the /signup/employee redirect and
  // any hand-crafted deep-link); any other value falls back to the default
  // Estudante/AuthNEI view.
  searchParams: Promise<{ modal?: string }>;
}

const LoginPage = async ({ searchParams }: LoginPageProps) => {
  const { modal } = await searchParams;
  return (
    <LoginCard initialView={modal === "employee" ? "employee" : undefined} />
  );
};

export default LoginPage;

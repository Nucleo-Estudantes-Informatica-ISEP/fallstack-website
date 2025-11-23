import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col md:flex-row h-svh bg-[#141414] pt-16 md:pt-0">
      {/* Mobile Hero - visible only on mobile */}
      <div className="w-full md:hidden">
        <Image
          src={"/assets/images/hero_privacy_policy.png"}
          width={1920}
          height={400}
          alt="Auth Header"
          className="w-full h-auto"
        />
      </div>

      {/* Desktop Side Image - visible only on desktop */}
      <div className="relative hidden md:block h-full w-full md:w-1/2">
        <Image
          src={"/assets/images/auth-component.png"}
          fill
          alt="Auth Header"
          className="object-cover"
        />
      </div>

      {/* Content Area */}
      <div className="flex w-full md:w-1/2 h-full items-center justify-center px-6 py-8 md:px-12 md:py-16 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;

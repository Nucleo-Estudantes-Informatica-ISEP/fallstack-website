
"use client";

import Spinner from "@/components/ui/Spinner";

interface PrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
  variant?: "default" | "form";
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  className,
  loading = false,
  variant = "default",
  disabled,
  type = "button",
  ...rest
}) => {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`inline-flex min-h-10 items-center justify-center rounded-full border border-transparent px-4 py-1 text-center text-sm leading-5 transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-80 ${
        variant === "form"
          ? "bg-[#82360d] hover:bg-[#6c2c09]"
          : "bg-[#B1440A]"
      } ${className ?? ""}`}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
};

export default PrimaryButton;

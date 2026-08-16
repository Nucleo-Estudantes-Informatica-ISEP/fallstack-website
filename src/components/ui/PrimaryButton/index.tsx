"use client";

import Spinner from "@/components/ui/Spinner";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  className,
  loading,
  disabled,
  onClick,
  ...rest
}) => {
  return (
    <button
      {...rest}
      onClick={onClick}
      disabled={disabled || loading}
      className={`h-10 border border-transparent bg-[#B1440A] px-4 py-1 text-center text-sm leading-5 transition-opacity duration-200 focus:ring focus:outline-none disabled:opacity-80 ${className}`}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
};

export default PrimaryButton;

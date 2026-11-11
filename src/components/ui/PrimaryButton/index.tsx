"use client";

import Spinner from "@/components/ui/Spinner";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  className,
  loading = false,
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
      className={`ui-action ${className ?? ""}`}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
};

export default PrimaryButton;

"use client";

import Spinner from "@/components/Spinner";

interface PrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  href: string;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  target?: string;
  rel?: string;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  href,
  className,
  loading,
  disabled,
  onClick,
  target,
  rel,
  ...rest
}) => {
  return (
    <a href={href} target={target} rel={rel}>
      <button
        {...rest}
        onClick={onClick}
        disabled={disabled || loading}
        className={`active:bg-primary flex items-center justify-between bg-white px-10 py-4 text-center text-xl leading-5 font-bold text-black opacity-70 transition-opacity duration-200 hover:opacity-100 disabled:opacity-50 ${className}`}
      >
        {loading ? <Spinner /> : children}
      </button>
    </a>
  );
};

export default PrimaryButton;

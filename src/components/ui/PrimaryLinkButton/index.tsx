"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";

import Spinner from "@/components/ui/Spinner";

interface PrimaryLinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  variant?: "default" | "form";
}

const PrimaryLinkButton: React.FC<PrimaryLinkButtonProps> = ({
  children,
  className,
  loading = false,
  disabled = false,
  variant = "default",
  href,
  onClick,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  return (
    <a
      {...rest}
      href={isDisabled ? undefined : href}
      onClick={(event) => {
        if (isDisabled) {
          event.preventDefault();
          return;
        }

        onClick?.(event);
      }}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      tabIndex={isDisabled ? -1 : rest.tabIndex}
      className={`inline-flex items-center justify-center transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        variant === "form"
          ? "min-h-10 rounded-full border border-transparent bg-[#82360d] px-4 py-1 text-center text-sm leading-5 text-white hover:bg-[#6c2c09]"
          : "bg-white px-10 py-4 text-xl font-bold text-black"
      } ${isDisabled ? "cursor-not-allowed opacity-60" : ""} ${className ?? ""}`}
    >
      {loading ? <Spinner /> : children}
    </a>
  );
};

export default PrimaryLinkButton;

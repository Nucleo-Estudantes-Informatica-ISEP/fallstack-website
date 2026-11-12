"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";

import Spinner from "@/components/ui/Spinner";

interface PrimaryLinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
}

const PrimaryLinkButton: React.FC<PrimaryLinkButtonProps> = ({
  children,
  className,
  loading = false,
  disabled = false,
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
      className={`inline-flex items-center justify-center bg-white px-10 py-4 text-xl font-bold text-black transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        isDisabled ? "cursor-not-allowed opacity-60" : ""
      } ${className ?? ""}`}
    >
      {loading ? <Spinner /> : children}
    </a>
  );
};

export default PrimaryLinkButton;

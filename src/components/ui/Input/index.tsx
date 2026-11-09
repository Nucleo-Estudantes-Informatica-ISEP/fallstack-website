"use client";

import React from "react";

import slugifyId from "@/utils/slugifyId";

export interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "defaultValue"
> {
  name: string;
  label?: React.ReactNode;
  center?: boolean;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  labelClassName?: string;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  type?: string;
  hint?: React.ReactNode;
  defaultValue?: string | number | readonly string[] | null;
}

const Input: React.FC<InputProps> = ({
  name,
  label,
  center,
  placeholder,
  className = "",
  containerClassName = "",
  labelClassName = "",
  disabled,
  inputRef,
  type = "text",
  id,
  hint,
  defaultValue,
  "aria-describedby": ariaDescribedBy,
  ...rest
}) => {
  const resolvedId = id || slugifyId(name) || undefined;
  const hintId = hint && resolvedId ? `${resolvedId}-hint` : undefined;
  const combinedAriaDescribedBy =
    [ariaDescribedBy, hintId].filter(Boolean).join(" ") || undefined;

  const displayLabel = label !== undefined ? label : name;

  return (
    <div className={`flex w-full flex-col ${containerClassName}`}>
      {displayLabel && (
        <label
          className={`mb-1.5 text-sm font-medium text-gray-100 ${
            center ? "text-left" : ""
          } ${labelClassName}`}
          htmlFor={resolvedId}
        >
          {displayLabel}
        </label>
      )}
      <input
        type={type}
        name={name}
        disabled={disabled}
        id={resolvedId}
        placeholder={placeholder}
        defaultValue={defaultValue ?? undefined}
        ref={inputRef}
        aria-describedby={combinedAriaDescribedBy}
        className={`h-12 w-full rounded-md border border-white/35 bg-background px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:border-primary focus:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/3 disabled:text-gray-400 disabled:opacity-100 ${className}`}
        {...rest}
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-gray-400">
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;

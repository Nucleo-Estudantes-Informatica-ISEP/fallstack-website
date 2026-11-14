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
  containerClassName?: string;
  labelClassName?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  hint?: React.ReactNode;
  defaultValue?: string | number | readonly string[] | null;
  icon?: React.ReactNode;
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
  icon,
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
          className={`field-label block text-gray-100 ${
            center ? "text-left" : ""
          } ${labelClassName}`}
          htmlFor={resolvedId}
        >
          {displayLabel}
        </label>
      )}

      <div className="relative flex w-full items-center">
        {icon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-(--field-icon-inset,1rem) flex items-center text-lg text-gray-400"
          >
            {icon}
          </span>
        )}

        <input
          {...rest}
          type={type}
          name={name}
          disabled={disabled}
          id={resolvedId}
          placeholder={placeholder}
          defaultValue={defaultValue ?? undefined}
          ref={inputRef}
          aria-describedby={combinedAriaDescribedBy}
          className={`field-height w-full field-focus-target rounded-full border field-border bg-background py-2 field-text text-white placeholder:text-gray-400 focus:border-primary focus:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/3 disabled:text-gray-400 disabled:opacity-100 disabled:[-webkit-text-fill-color:currentColor] ${
            icon ? "pr-4 pl-(--field-icon-padding,2.75rem)" : "px-4"
          } ${className}`}
        />
      </div>

      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-gray-400">
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;

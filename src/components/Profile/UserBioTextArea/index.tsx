"use client";

import { Ref, useId } from "react";

interface UserBioTextAreaProps {
  ref?: Ref<HTMLTextAreaElement>;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  value: string;
  setValue: (value: string) => void;
  limit: number;
  warningLimit: number;
  name: string;
  id?: string;
  autoFocus?: boolean;
  counterClassName?: string;
}

const UserBioTextArea: React.FC<UserBioTextAreaProps> = ({
  ref,
  disabled,
  rows = 5,
  placeholder = "Escreve algo sobre ti...",
  setValue,
  limit,
  warningLimit,
  value,
  className,
  name,
  id,
  autoFocus,
  counterClassName = "mt-1 text-left text-sm",
}) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <div className="flex w-full flex-col">
      {name && (
        <label
          className="field-label text-left text-gray-100"
          htmlFor={fieldId}
        >
          {name}
        </label>
      )}

      <textarea
        id={fieldId}
        name={name}
        ref={ref}
        disabled={disabled}
        rows={rows}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        aria-describedby={`${fieldId}-count`}
        maxLength={limit}
        onChange={(e) => setValue(e.target.value)}
        className={`max-h-100 min-h-32 resize-y field-focus-target border field-border bg-background px-4 py-2 field-text text-white placeholder:text-gray-400 focus:border-primary focus:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/3 disabled:text-gray-400 disabled:opacity-100 ${className ?? ""}`}
      />

      <p
        id={`${fieldId}-count`}
        className={`${counterClassName} ${
          value.length > limit - 10
            ? "text-red-400"
            : value.length > warningLimit
              ? "text-yellow-500"
              : "text-gray-400"
        }`}
      >
        {value.length} / {limit} caracteres
      </p>
    </div>
  );
};

export default UserBioTextArea;

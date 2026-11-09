"use client";

import { Ref } from "react";

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
  id = name,
  autoFocus,
}) => {
  return (
    <div className="flex w-full flex-col">
      {name && (
        <label
          className="mb-1.5 text-left text-sm font-medium text-gray-100"
          htmlFor={id}
        >
          {name}
        </label>
      )}

      <textarea
        id={id}
        name={name}
        ref={ref}
        disabled={disabled}
        rows={rows}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        maxLength={limit}
        onChange={(e) => setValue(e.target.value)}
        style={{
          resize: "vertical",
          minHeight: "200px",
          maxHeight: "400px",
        }}
        className={`rounded-2xl border border-white/35 bg-background p-4 text-sm text-white placeholder:text-gray-400 focus:border-primary focus:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/3 disabled:text-gray-400 disabled:opacity-100 ${className ?? ""}`}
      />

      <p
        className={`mt-1.5 text-left text-xs ${
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

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
  autoFocus,
}) => {
  return (
    <div className="flex w-full flex-col">
      <label
        className="mb-1 text-left text-sm font-normal text-white"
        htmlFor={name}
      >
        {name}
      </label>

      <textarea
        id={name}
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
        className={`border border-white/35 bg-[#141414] px-2 py-1 text-sm text-white placeholder:text-white/35 focus:border-primary focus:ring-0 disabled:cursor-not-allowed disabled:text-gray-600 ${className}`}
      />

      <p
        className={`text-right ${
          value.length > limit - 10
            ? "text-red-600"
            : value.length > warningLimit
              ? "text-yellow-500"
              : "text-white/70"
        }`}
      >
        {value.length} / {limit} caracteres
      </p>
    </div>
  );
};

export default UserBioTextArea;

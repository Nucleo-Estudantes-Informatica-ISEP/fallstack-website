"use client";

import { forwardRef, Ref } from "react";

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
      <label className="text-lg text-slate-700" htmlFor={name}>
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
        onChange={(e) => setValue(e.target.value)}
        style={{
          resize: "vertical",
          minHeight: "100px",
          maxHeight: "200px",
        }}
        className={`rounded-md border border-gray-300 bg-slate-200 px-4
          py-2 text-black placeholder:text-gray-400 focus:border-primary 
          focus:ring-0 disabled:cursor-not-allowed disabled:text-gray-600 ${className}`}
      />

      <p
        className={`text-right ${
          value.length > limit - 10
            ? "text-red-600"
            : value.length > warningLimit
              ? "text-yellow-500"
              : "text-slate-700"
        }`}
      >
        {value.length} / {limit} caracteres
      </p>
    </div>
  );
};

export default UserBioTextArea;

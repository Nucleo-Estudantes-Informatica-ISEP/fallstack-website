"use client";

import slugifyId from "@/utils/slugifyId";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  center?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  type?: string;
}

const Input: React.FC<InputProps> = ({
  name,
  center,
  placeholder,
  className,
  disabled,
  inputRef,
  type = "text",
  id,
  ...rest
}) => {
  const resolvedId = id || slugifyId(name) || undefined;

  return (
    <div className="flex w-full flex-col">
      {name && (
        <label
          className={`mb-1 text-sm font-normal text-white ${
            center ? "text-left" : ""
          }`}
          htmlFor={resolvedId}
        >
          {name}
        </label>
      )}
      <input
        type={type}
        name={name}
        disabled={disabled}
        id={resolvedId}
        placeholder={placeholder}
        ref={inputRef}
        className={`h-14 w-full border border-white/35 bg-background px-2 py-1 text-sm text-white placeholder:text-white/50 focus:border-primary focus:ring-0 disabled:text-gray-600 ${className}`}
        {...rest}
      />
    </div>
  );
};

export default Input;

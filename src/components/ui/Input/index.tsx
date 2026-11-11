"use client";

import slugifyId from "@/utils/slugifyId";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  center?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
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
        {...rest}
        type={type}
        name={name}
        disabled={disabled}
        id={resolvedId}
        placeholder={placeholder}
        ref={inputRef}
        className={`ui-field h-14 ${className ?? ""}`}
      />
    </div>
  );
};

export default Input;

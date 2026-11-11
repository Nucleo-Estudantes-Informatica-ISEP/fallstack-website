"use client";

import slugifyId from "@/utils/slugifyId";

interface InputSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name: string;
  center?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLSelectElement>;
  options: string[];
}

const InputSelect: React.FC<InputSelectProps> = ({
  name,
  center,
  placeholder,
  className,
  disabled,
  inputRef,
  options,
  id,
  defaultValue,
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
      <select
        name={name}
        id={resolvedId}
        disabled={disabled}
        defaultValue={defaultValue ?? (placeholder ? "" : undefined)}
        ref={inputRef}
        className={`ui-field h-14 ${className ?? ""}`}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

export default InputSelect;

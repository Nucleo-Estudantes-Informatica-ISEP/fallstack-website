"use client";

interface InputSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
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
  ...rest
}) => {
  return (
    <div className="flex w-full flex-col">
      <label
        className={`mb-1 text-sm font-normal text-white ${
          center ? "text-left" : ""
        }`}
        htmlFor={name}
      >
        {name}
      </label>
      <select
        name={name}
        id={name}
        disabled={disabled}
        defaultValue={placeholder}
        ref={inputRef}
        className={`h-14 w-full border border-white/35 bg-[#141414] px-2 py-1 text-sm text-white placeholder:text-white/35 focus:border-primary focus:ring-0 disabled:text-gray-600 ${className}`}
        {...rest}
      >
        {options.map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

export default InputSelect;

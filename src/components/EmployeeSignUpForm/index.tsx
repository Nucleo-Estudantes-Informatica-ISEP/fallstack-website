"use client";

import { useState } from "react";
import { toast } from "react-toastify";

import Input from "@/components/ui/Input";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { signUpEmployee } from "@/client/api/auth";

interface EmployeeSignUpFormProps {
  // Called after a successful signup, so the caller decides what happens
  // next (e.g. the card switches back to the login tab so the user can sign
  // in with the credentials they just created, instead of a full page
  // navigation).
  onSuccess?: () => void;
}

const fieldClassName =
  "!rounded-lg !border-[rgba(255,255,255,0.35)] bg-transparent px-3 py-2 text-white placeholder:text-gray-500 sm:py-3";

const EmployeeSignUpForm: React.FC<EmployeeSignUpFormProps> = ({
  onSuccess,
}) => {
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    linkedin: "",
    companyCode: "",
  });
  const [loading, setLoading] = useState(false);

  const codeValid = /^\d{8}$/.test(form.companyCode);
  const canSubmit =
    codeValid && form.email && form.password && form.name && !loading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await signUpEmployee(form);

    setLoading(false);
    if (res instanceof Error) {
      toast.error(res.message);
      return;
    }

    toast.success("Signup successful");
    onSuccess?.();
  };

  const onChange =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm({ ...form, [key]: e.target.value });
    };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="w-full">
        <Input
          name="Email"
          type="email"
          placeholder="exemplo@dominio.com"
          value={form.email}
          onChange={onChange("email")}
          className={fieldClassName}
          required
        />
      </div>
      <div className="w-full">
        <Input
          name="Password"
          type="password"
          placeholder="Mínimo 8 caracteres"
          value={form.password}
          onChange={onChange("password")}
          className={fieldClassName}
          required
        />
      </div>
      <div className="w-full">
        <Input
          name="Nome"
          placeholder="João Silva"
          value={form.name}
          onChange={onChange("name")}
          className={fieldClassName}
          required
        />
      </div>
      <div className="w-full">
        <Input
          name="LinkedIn (opcional)"
          placeholder="https://linkedin.com/in/..."
          value={form.linkedin}
          onChange={onChange("linkedin")}
          className={fieldClassName}
        />
      </div>
      <div className="w-full">
        <Input
          name="Código da Empresa (8 dígitos)"
          placeholder="12345678"
          value={form.companyCode}
          onChange={onChange("companyCode")}
          className={fieldClassName}
          required
        />
        {!codeValid && form.companyCode.length > 0 && (
          <p className="mt-1 text-xs font-semibold text-red-500">
            Tem de ter exatamente 8 dígitos numéricos.
          </p>
        )}
      </div>
      <PrimaryButton
        loading={loading}
        type="submit"
        disabled={!canSubmit}
        className="!flex w-full cursor-pointer !items-center !justify-center !rounded-lg !bg-[#B1440A] !px-3 py-3 !text-[17px] font-semibold !tracking-normal hover:!bg-[#8d3508] disabled:cursor-not-allowed disabled:!bg-[#3d1806] sm:py-4 sm:!text-[19px]"
      >
        Registar
      </PrimaryButton>
    </form>
  );
};

export default EmployeeSignUpForm;

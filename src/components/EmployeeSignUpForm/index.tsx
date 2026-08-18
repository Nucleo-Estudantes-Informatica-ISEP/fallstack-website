"use client";

import { useState } from "react";
import { toast } from "react-toastify";

import Input from "@/components/ui/Input";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { signUpEmployee } from "@/client/api/auth";

interface EmployeeSignUpFormProps {
  onSuccess?: () => void;
}

const fieldClassName =
  "!rounded-lg !border-[rgba(255,255,255,0.35)] bg-transparent px-3 py-2 text-white placeholder:text-gray-500 sm:py-3";

const EmployeeSignUpForm: React.FC<EmployeeSignUpFormProps> = ({ onSuccess }) => {
  const [form, setForm] = useState({
    name: "",
    linkedin: "",
    companyCode: "",
  });
  const [loading, setLoading] = useState(false);

  const codeValid = /^[A-Za-z0-9_-]{8,80}$/u.test(form.companyCode);
  const canSubmit = codeValid && form.name.trim().length >= 2 && !loading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    const res = await signUpEmployee(form);
    setLoading(false);

    if (res instanceof Error) {
      toast.error(res.message);
      return;
    }

    toast.success("Conta associada à empresa com sucesso.");
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
          name="Código da Empresa"
          placeholder="fs_emp_..."
          value={form.companyCode}
          onChange={onChange("companyCode")}
          className={fieldClassName}
          autoComplete="off"
          required
        />
        {!codeValid && form.companyCode.length > 0 && (
          <p className="mt-1 text-xs font-semibold text-red-500">
            Código de empresa inválido.
          </p>
        )}
      </div>
      <PrimaryButton
        loading={loading}
        type="submit"
        disabled={!canSubmit}
        className="!flex w-full cursor-pointer !items-center !justify-center !rounded-lg !bg-[#B1440A] !px-3 py-3 !text-[17px] font-semibold !tracking-normal hover:!bg-[#8d3508] disabled:cursor-not-allowed disabled:!bg-[#3d1806] sm:py-4 sm:!text-[19px]"
      >
        Associar à empresa
      </PrimaryButton>
    </form>
  );
};

export default EmployeeSignUpForm;

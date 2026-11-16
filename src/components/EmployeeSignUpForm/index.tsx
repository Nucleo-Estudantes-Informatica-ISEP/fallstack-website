"use client";

import { useState } from "react";
import { toast } from "react-toastify";

import Input from "@/components/ui/Input";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { signUpEmployee } from "@/client/api/auth";

interface EmployeeSignUpFormProps {
  onSuccess?: () => void;
}

const EmployeeSignUpForm: React.FC<EmployeeSignUpFormProps> = ({
  onSuccess,
}) => {
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
          required
        />
      </div>
      <div className="w-full">
        <Input
          name="LinkedIn (opcional)"
          placeholder="https://linkedin.com/in/..."
          value={form.linkedin}
          onChange={onChange("linkedin")}
        />
      </div>
      <div className="w-full">
        <Input
          name="Código da Empresa"
          placeholder="fs_emp_..."
          value={form.companyCode}
          onChange={onChange("companyCode")}
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
        variant="form"
        className="mt-2 h-12 w-full font-semibold lg:h-16 lg:text-xl"
      >
        Associar à empresa
      </PrimaryButton>
    </form>
  );
};

export default EmployeeSignUpForm;

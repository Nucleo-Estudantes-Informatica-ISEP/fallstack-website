"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import Input from "@/components/Input";
import InputLabel from "@/components/InputLabel";
import PrimaryButton from "@/components/PrimaryButton";
import { signUpEmployee } from "@/client/api/auth";

export default function EmployeeSignupPage() {
  const router = useRouter();
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
    router.push("/login");
  };

  const onChange =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm({ ...form, [key]: e.target.value });
    };

  return (
    <div className="relative max-h-[90vh] w-full overflow-hidden md:mt-4">
      <section className="flex max-h-[85vh] flex-col overflow-y-auto">
        <h1 className="mb-8 w-full text-center font-sans text-[24px] font-semibold text-white md:text-left md:text-[45px]">
          Registo Colaborador
        </h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="w-full">
            <InputLabel>Email</InputLabel>
            <Input
              name="Email"
              type="email"
              value={form.email}
              onChange={onChange("email")}
              className="!rounded-none !border-[rgba(255,255,255,0.35)] bg-transparent px-3 py-2 text-white placeholder:text-gray-500 sm:py-3"
              required
            />
          </div>
          <div className="w-full">
            <InputLabel>Password</InputLabel>
            <Input
              name="Password"
              type="password"
              value={form.password}
              onChange={onChange("password")}
              className="!rounded-none !border-[rgba(255,255,255,0.35)] bg-transparent px-3 py-2 text-white placeholder:text-gray-500 sm:py-3"
              required
            />
          </div>
          <div className="w-full">
            <InputLabel>Nome</InputLabel>
            <Input
              name="Nome"
              value={form.name}
              onChange={onChange("name")}
              className="!rounded-none !border-[rgba(255,255,255,0.35)] bg-transparent px-3 py-2 text-white placeholder:text-gray-500 sm:py-3"
              required
            />
          </div>
          <div className="w-full">
            <InputLabel>LinkedIn (opcional)</InputLabel>
            <Input
              name="LinkedIn (Optional)"
              value={form.linkedin}
              onChange={onChange("linkedin")}
              placeholder="https://linkedin.com/in/..."
              className="!rounded-none !border-[rgba(255,255,255,0.35)] bg-transparent px-3 py-2 text-white placeholder:text-gray-500 sm:py-3"
            />
          </div>
          <div className="w-full">
            <InputLabel>Código da Empresa (8 dígitos)</InputLabel>
            <Input
              name="Codigo"
              value={form.companyCode}
              onChange={onChange("companyCode")}
              className="!rounded-none !border-[rgba(255,255,255,0.35)] bg-transparent px-3 py-2 text-white placeholder:text-gray-500 sm:py-3"
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
            className="!flex w-full cursor-pointer !items-center !justify-center !rounded-none !bg-[#B1440A] !px-3 py-3 !text-[17px] font-semibold !tracking-normal hover:!bg-[#8d3508] disabled:cursor-not-allowed disabled:!bg-[#3d1806] sm:py-4 sm:!text-[19px]"
          >
            Registar
          </PrimaryButton>
          <button
            type="button"
            className="text-sm text-gray-400 underline"
            onClick={() => router.push("/signup")}
          >
            Registar estudante
          </button>
        </form>
      </section>
    </div>
  );
}

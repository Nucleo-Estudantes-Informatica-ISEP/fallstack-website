"use client";

import React, { useRef, useState } from "react";
import Swal from "sweetalert";

import { httpClient } from "@/lib/http/client";
import { useMutation } from "@/hooks/useMutation";
import type { AdminCompanyDto } from "@/application/dto/companyDto";

const TIERS = ["DIAMOND", "GOLD", "SILVER", "BRONZE"] as const;

interface CompanyRowProps {
  company: AdminCompanyDto;
  onSaved: (company: AdminCompanyDto) => void;
}

const CompanyRow: React.FC<CompanyRowProps> = ({ company, onSaved }) => {
  const websiteRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const orderRef = useRef<HTMLInputElement>(null);
  const tierRef = useRef<HTMLSelectElement>(null);
  const [active, setActive] = useState(company.active);
  const { mutate, isPending } = useMutation(
    "Não foi possível atualizar a empresa."
  );

  const handleSave = () =>
    mutate(async () => {
      const updated = await httpClient.patch<AdminCompanyDto>(
        `/admin/companies/${company.id}`,
        {
          tier: tierRef.current?.value,
          website: websiteRef.current?.value || null,
          avatar: avatarRef.current?.value || null,
          order: Number(orderRef.current?.value ?? 0),
          active,
        }
      );
      onSaved(updated);
      Swal("Sucesso", "Empresa atualizada.", "success");
    });

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-300 p-4 md:flex-row md:items-center md:gap-4">
      <span className="min-w-40 font-bold text-gray-800">{company.name}</span>
      <select
        ref={tierRef}
        defaultValue={company.tier}
        className="rounded-md border border-gray-300 p-2 text-black"
      >
        {TIERS.map((tier) => (
          <option key={tier} value={tier}>
            {tier}
          </option>
        ))}
      </select>
      <input
        ref={websiteRef}
        type="text"
        placeholder="Website"
        defaultValue={company.website ?? ""}
        className="min-w-48 flex-1 rounded-md border border-gray-300 p-2 text-black"
      />
      <input
        ref={avatarRef}
        type="text"
        placeholder="URL do logo"
        defaultValue={company.avatar ?? ""}
        className="min-w-48 flex-1 rounded-md border border-gray-300 p-2 text-black"
      />
      <input
        ref={orderRef}
        type="number"
        defaultValue={company.order}
        className="w-20 rounded-md border border-gray-300 p-2 text-black"
      />
      <label className="flex items-center gap-1 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        Ativa
      </label>
      <button
        onClick={handleSave}
        disabled={isPending}
        className="rounded-md bg-blue-500 p-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "A guardar..." : "Guardar"}
      </button>
    </div>
  );
};

interface CompanyAdminSectionProps {
  companies: AdminCompanyDto[];
}

const CompanyAdminSection: React.FC<CompanyAdminSectionProps> = ({
  companies: initialCompanies,
}) => {
  const [companies, setCompanies] = useState(initialCompanies);
  const nameRef = useRef<HTMLInputElement>(null);
  const tierRef = useRef<HTMLSelectElement>(null);
  const { mutate: mutateCreate, isPending: isCreating } = useMutation(
    "Não foi possível criar a empresa."
  );

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    mutateCreate(async () => {
      const created = await httpClient.post<AdminCompanyDto>(
        "/admin/companies",
        {
          name: nameRef.current?.value,
          tier: tierRef.current?.value,
        }
      );
      setCompanies((prev) => [...prev, created]);
      if (nameRef.current) nameRef.current.value = "";
      Swal("Sucesso", "Empresa criada.", "success");
    });
  };

  const handleSaved = (updated: AdminCompanyDto) =>
    setCompanies((prev) =>
      prev.map((company) => (company.id === updated.id ? updated : company))
    );

  return (
    <div className="flex w-full max-w-4xl flex-col gap-8">
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-gray-100 p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800">Adicionar empresa</h2>
        <form
          onSubmit={handleCreate}
          className="flex w-full max-w-md flex-col gap-4"
        >
          <input
            ref={nameRef}
            type="text"
            placeholder="Nome da empresa"
            required
            className="rounded-md border border-gray-300 p-2 text-black"
          />
          <select
            ref={tierRef}
            defaultValue="BRONZE"
            className="rounded-md border border-gray-300 p-2 text-black"
          >
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isCreating}
            className="rounded-md bg-blue-500 p-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? "A criar..." : "Criar empresa"}
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Empresas ({companies.length})
        </h2>
        {companies.map((company) => (
          <CompanyRow
            key={company.id}
            company={company}
            onSaved={handleSaved}
          />
        ))}
      </div>
    </div>
  );
};

export default CompanyAdminSection;

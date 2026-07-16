"use client";

import React, { useRef, useState } from "react";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import { useMutation } from "@/hooks/useMutation";
import type { AdminSponsorDto } from "@/application/dto/sponsorDto";

interface SponsorRowProps {
  sponsor: AdminSponsorDto;
  onSaved: (sponsor: AdminSponsorDto) => void;
}

const SponsorRow: React.FC<SponsorRowProps> = ({ sponsor, onSaved }) => {
  const websiteRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const orderRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(sponsor.active);
  const { mutate, isPending } = useMutation(
    "Não foi possível atualizar o patrocinador."
  );

  const handleSave = () =>
    mutate(async () => {
      const updated = await httpClient.patch<AdminSponsorDto>(
        `/admin/sponsors/${sponsor.id}`,
        {
          logo: logoRef.current?.value,
          website: websiteRef.current?.value || null,
          order: Number(orderRef.current?.value ?? 0),
          active,
        }
      );
      onSaved(updated);
      toast.success("Patrocinador atualizado.");
    });

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-300 p-4 md:flex-row md:items-center md:gap-4">
      <span className="min-w-40 font-bold text-gray-800">{sponsor.name}</span>
      <input
        ref={websiteRef}
        type="text"
        placeholder="Website"
        defaultValue={sponsor.website ?? ""}
        className="min-w-48 flex-1 rounded-md border border-gray-300 p-2 text-black"
      />
      <input
        ref={logoRef}
        type="text"
        placeholder="URL do logo"
        defaultValue={sponsor.logo}
        className="min-w-48 flex-1 rounded-md border border-gray-300 p-2 text-black"
      />
      <input
        ref={orderRef}
        type="number"
        defaultValue={sponsor.order}
        className="w-20 rounded-md border border-gray-300 p-2 text-black"
      />
      <label className="flex items-center gap-1 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        Ativo
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

interface SponsorAdminSectionProps {
  sponsors: AdminSponsorDto[];
}

const SponsorAdminSection: React.FC<SponsorAdminSectionProps> = ({
  sponsors: initialSponsors,
}) => {
  const [sponsors, setSponsors] = useState(initialSponsors);
  const nameRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const { mutate: mutateCreate, isPending: isCreating } = useMutation(
    "Não foi possível criar o patrocinador."
  );

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    mutateCreate(async () => {
      const created = await httpClient.post<AdminSponsorDto>(
        "/admin/sponsors",
        {
          name: nameRef.current?.value,
          logo: logoRef.current?.value,
        }
      );
      setSponsors((prev) => [...prev, created]);
      if (nameRef.current) nameRef.current.value = "";
      if (logoRef.current) logoRef.current.value = "";
      toast.success("Patrocinador criado.");
    });
  };

  const handleSaved = (updated: AdminSponsorDto) =>
    setSponsors((prev) =>
      prev.map((sponsor) => (sponsor.id === updated.id ? updated : sponsor))
    );

  return (
    <div className="flex w-full max-w-4xl flex-col gap-8">
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-gray-100 p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800">
          Adicionar patrocinador
        </h2>
        <form
          onSubmit={handleCreate}
          className="flex w-full max-w-md flex-col gap-4"
        >
          <input
            ref={nameRef}
            type="text"
            placeholder="Nome do patrocinador"
            required
            className="rounded-md border border-gray-300 p-2 text-black"
          />
          <input
            ref={logoRef}
            type="text"
            placeholder="URL do logo"
            required
            className="rounded-md border border-gray-300 p-2 text-black"
          />
          <button
            type="submit"
            disabled={isCreating}
            className="rounded-md bg-blue-500 p-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? "A criar..." : "Criar patrocinador"}
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Patrocinadores ({sponsors.length})
        </h2>
        {sponsors.map((sponsor) => (
          <SponsorRow
            key={sponsor.id}
            sponsor={sponsor}
            onSaved={handleSaved}
          />
        ))}
      </div>
    </div>
  );
};

export default SponsorAdminSection;

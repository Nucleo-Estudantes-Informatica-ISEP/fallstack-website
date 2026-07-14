"use client";

import React, { useState } from "react";
import Swal from "sweetalert";

import { httpClient } from "@/lib/http/client";
import { useMutation } from "@/hooks/useMutation";
import type { CompanyDto } from "@/application/dto/companyDto";

interface AdminSavedSectionProps {
  companies: CompanyDto[];
}

const AdminSavedSection: React.FC<AdminSavedSectionProps> = ({ companies }) => {
  const [studentEmailNumber, setStudentEmailNumber] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const { mutate, isPending } = useMutation();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    mutate(async () => {
      await httpClient.post("/admin/save-student", {
        studentEmailNumber,
        companyId: selectedCompany,
      });

      Swal("Success", "Student saved successfully!", "success");
    });
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 rounded-3xl bg-gray-100 p-8 shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800">Save Student</h2>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-4"
      >
        <label className="flex flex-col gap-2">
          <span className="text-gray-700">Select Company:</span>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            required
            className="rounded-md border border-gray-300 p-2 text-black"
          >
            <option value="" disabled>
              Select a company
            </option>
            {companies.map((company) => (
              <option
                key={company.id}
                value={company.id}
                className="text-black"
              >
                {company.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-gray-700">Student Email/Number:</span>
          <input
            type="text"
            value={studentEmailNumber}
            onChange={(e) => setStudentEmailNumber(e.target.value)}
            required
            className="rounded-md border border-gray-300 p-2 text-black"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-500 p-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "A guardar..." : "Save Student"}
        </button>
      </form>
    </div>
  );
};

export default AdminSavedSection;

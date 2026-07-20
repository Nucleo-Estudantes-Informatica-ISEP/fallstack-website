"use client";

import { useState } from "react";

export type AdminFormValue = string | number | boolean;

export interface AdminFormField {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "checkbox";
  required?: boolean;
  options?: { label: string; value: string }[];
}

interface AdminFormProps {
  /** Present -> editing an existing record; absent -> creating a new one. */
  id?: string;
  fields: AdminFormField[];
  defaultValues?: Record<string, AdminFormValue>;
  onSubmit: (values: Record<string, AdminFormValue>) => Promise<void> | void;
  submitLabels?: { create: string; edit: string };
}

const AdminForm: React.FC<AdminFormProps> = ({
  id,
  fields,
  defaultValues = {},
  onSubmit,
  submitLabels = { create: "Criar", edit: "Guardar" },
}) => {
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values: Record<string, AdminFormValue> = {};
    for (const field of fields) {
      if (field.type === "checkbox") {
        values[field.name] = formData.get(field.name) === "on";
      } else if (field.type === "number") {
        values[field.name] = Number(formData.get(field.name) ?? 0);
      } else {
        values[field.name] = String(formData.get(field.name) ?? "");
      }
    }
    setIsPending(true);
    try {
      await onSubmit(values);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-4"
    >
      {fields.map((field) => (
        <label
          key={field.name}
          className="flex flex-col gap-1 text-sm text-gray-700"
        >
          {field.label}
          {field.type === "checkbox" ? (
            <input
              type="checkbox"
              name={field.name}
              defaultChecked={Boolean(defaultValues[field.name])}
            />
          ) : field.options ? (
            <select
              name={field.name}
              defaultValue={String(defaultValues[field.name] ?? "")}
              required={field.required}
              className="rounded-md border border-gray-300 p-2 text-black"
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type ?? "text"}
              name={field.name}
              defaultValue={
                defaultValues[field.name] !== undefined
                  ? String(defaultValues[field.name])
                  : ""
              }
              required={field.required}
              className="rounded-md border border-gray-300 p-2 text-black"
            />
          )}
        </label>
      ))}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-500 p-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "A guardar..."
          : id
            ? submitLabels.edit
            : submitLabels.create}
      </button>
    </form>
  );
};

export default AdminForm;

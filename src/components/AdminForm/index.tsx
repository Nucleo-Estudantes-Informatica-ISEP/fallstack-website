"use client";

import { useId, useState } from "react";
import { toast } from "react-toastify";

import LogoThumbnail from "@/components/ui/LogoThumbnail";
import { uploadAdminImage } from "@/client/api/adminUpload";

export type AdminFormValue = string | number | boolean | string[];

interface AdminFormFieldBase {
  name: string;
  label: string;
}

export interface AdminFormTextField extends AdminFormFieldBase {
  kind: "text" | "email" | "number" | "time";
  required?: boolean;
}

export interface AdminFormTextareaField extends AdminFormFieldBase {
  kind: "textarea";
  required?: boolean;
  rows?: number;
}

export interface AdminFormCheckboxField extends AdminFormFieldBase {
  kind: "checkbox";
}

export interface AdminFormSelectField extends AdminFormFieldBase {
  kind: "select";
  options: { label: string; value: string }[];
  required?: boolean;
}

export interface AdminFormMultiSelectField extends AdminFormFieldBase {
  kind: "multiSelect";
  options: { label: string; value: string }[];
}

export type AdminFormField =
  | AdminFormTextField
  | AdminFormTextareaField
  | AdminFormCheckboxField
  | AdminFormSelectField
  | AdminFormMultiSelectField;

export interface AdminFormFieldsSection {
  kind: "fields";
  title: string;
  fields: AdminFormField[];
}

export interface AdminFormImageSection {
  kind: "image";
  title: string;
  /** Key this section's uploaded URL lands under in the submitted values. */
  name: string;
  currentUrl?: string;
}

export interface AdminFormPasswordSection {
  kind: "password";
  title: string;
  /** Key the new password lands under in the submitted values, when set. */
  name: string;
}

export type AdminFormSection =
  AdminFormFieldsSection | AdminFormImageSection | AdminFormPasswordSection;

interface AdminFormProps {
  /** Present -> editing an existing record; absent -> creating a new one. */
  id?: string;
  sections: AdminFormSection[];
  defaultValues?: Record<string, AdminFormValue>;
  onSubmit: (values: Record<string, AdminFormValue>) => Promise<void> | void;
  submitLabels?: { create: string; edit: string };
}

const inputClassName =
  "rounded-md border border-gray-300 p-2 text-black disabled:opacity-60";

interface FormFieldProps {
  field: AdminFormField;
  defaultValue?: AdminFormValue;
}

const FormField: React.FC<FormFieldProps> = ({ field, defaultValue }) => {
  if (field.kind === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name={field.name}
          defaultChecked={Boolean(defaultValue)}
        />
        {field.label}
      </label>
    );
  }

  if (field.kind === "select") {
    return (
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {field.label}
        <select
          name={field.name}
          defaultValue={defaultValue !== undefined ? String(defaultValue) : ""}
          required={field.required}
          className={inputClassName}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.kind === "multiSelect") {
    const selected = Array.isArray(defaultValue)
      ? defaultValue.map(String)
      : [];
    return (
      <fieldset className="flex flex-col gap-1 text-sm text-gray-700">
        <legend>{field.label}</legend>
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-gray-300 p-2">
          {field.options.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                name={field.name}
                value={option.value}
                defaultChecked={selected.includes(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.kind === "textarea") {
    return (
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {field.label}
        <textarea
          name={field.name}
          defaultValue={defaultValue !== undefined ? String(defaultValue) : ""}
          required={field.required}
          rows={field.rows ?? 4}
          className={inputClassName}
        />
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      {field.label}
      <input
        type={field.kind}
        name={field.name}
        defaultValue={defaultValue !== undefined ? String(defaultValue) : ""}
        required={field.required}
        className={inputClassName}
      />
    </label>
  );
};

interface AdminFormImageFieldProps {
  currentUrl?: string;
  onUploaded: (url: string) => void;
}

const AdminFormImageField: React.FC<AdminFormImageFieldProps> = ({
  currentUrl,
  onUploaded,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const inputId = useId();

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await uploadAdminImage(file);
      if (!result) {
        toast.error("Não foi possível enviar a imagem.");
        return;
      }
      onUploaded(result.url);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      {currentUrl ? (
        <LogoThumbnail src={currentUrl} size={64} />
      ) : (
        <div className="flex size-16 items-center justify-center rounded-full bg-gray-100 text-center text-xs text-gray-400">
          Sem imagem
        </div>
      )}
      <label
        htmlFor={inputId}
        className="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
      >
        {isUploading ? "A enviar..." : "Escolher imagem"}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={isUploading}
        onChange={handleChange}
      />
    </div>
  );
};

function sectionKey(section: AdminFormSection) {
  return section.kind === "fields" ? section.title : section.name;
}

const AdminForm: React.FC<AdminFormProps> = ({
  id,
  sections,
  defaultValues = {},
  onSubmit,
  submitLabels = { create: "Criar", edit: "Guardar" },
}) => {
  const [isPending, setIsPending] = useState(false);
  const [imageValues, setImageValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const section of sections) {
      if (section.kind === "image" && section.currentUrl) {
        initial[section.name] = section.currentUrl;
      }
    }
    return initial;
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values: Record<string, AdminFormValue> = { ...imageValues };

    for (const section of sections) {
      if (section.kind === "fields") {
        for (const field of section.fields) {
          if (field.kind === "checkbox") {
            values[field.name] = formData.get(field.name) === "on";
          } else if (field.kind === "number") {
            values[field.name] = Number(formData.get(field.name) ?? 0);
          } else if (field.kind === "multiSelect") {
            values[field.name] = formData.getAll(field.name).map(String);
          } else {
            values[field.name] = String(formData.get(field.name) ?? "");
          }
        }
      } else if (section.kind === "password") {
        const password = String(formData.get(`${section.name}-new`) ?? "");
        const confirm = String(formData.get(`${section.name}-confirm`) ?? "");
        if (password || confirm) {
          if (password !== confirm) {
            toast.error("As palavras-passe não coincidem.");
            return;
          }
          values[section.name] = password;
        }
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
      className="flex w-full max-w-2xl flex-col gap-6"
    >
      {sections.map((section) => (
        <div
          key={sectionKey(section)}
          className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
            {section.title}
          </h3>

          {section.kind === "fields" &&
            section.fields.map((field) => (
              <FormField
                key={field.name}
                field={field}
                defaultValue={defaultValues[field.name]}
              />
            ))}

          {section.kind === "image" && (
            <AdminFormImageField
              currentUrl={imageValues[section.name]}
              onUploaded={(url) =>
                setImageValues((prev) => ({ ...prev, [section.name]: url }))
              }
            />
          )}

          {section.kind === "password" && (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm text-gray-700">
                Nova palavra-passe
                <input
                  type="password"
                  name={`${section.name}-new`}
                  autoComplete="new-password"
                  className={inputClassName}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-gray-700">
                Confirmar palavra-passe
                <input
                  type="password"
                  name={`${section.name}-confirm`}
                  autoComplete="new-password"
                  className={inputClassName}
                />
              </label>
              <p className="text-xs text-gray-400">
                Deixe em branco para manter a palavra-passe atual.
              </p>
            </div>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-primary p-2 text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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

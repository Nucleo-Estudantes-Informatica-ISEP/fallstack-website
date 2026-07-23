"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";

interface AdminToggleButtonProps {
  checked: boolean;
  /** PATCHed with { [field]: !checked } on click. */
  patchUrl: string;
  field: string;
  label: string;
}

const AdminToggleButton: React.FC<AdminToggleButtonProps> = ({
  checked,
  patchUrl,
  field,
  label,
}) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    setIsPending(true);
    try {
      await httpClient.patch(patchUrl, { [field]: !checked });
      router.refresh();
    } catch {
      toast.error("Não foi possível atualizar.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={isPending}
      onClick={handleClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
        checked ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
};

export default AdminToggleButton;

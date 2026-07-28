"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import ConfirmDialog from "@/components/ConfirmDialog";

interface AdminDeleteButtonProps {
  deleteUrl: string;
  itemLabel: string;
  disabled?: boolean;
  disabledReason?: string;
}

const AdminDeleteButton: React.FC<AdminDeleteButtonProps> = ({
  deleteUrl,
  itemLabel,
  disabled,
  disabledReason,
}) => {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await httpClient.delete(deleteUrl);
      setIsVisible(false);
      router.refresh();
    } catch {
      toast.error("Não foi possível eliminar.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsVisible(true)}
        disabled={disabled}
        aria-label={`Eliminar ${itemLabel}`}
        title={disabled ? disabledReason : undefined}
        className="text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
      >
        🗑
      </button>
      <ConfirmDialog
        isVisible={isVisible}
        setIsVisible={setIsVisible}
        title="Eliminar"
        message={`Tem a certeza que quer eliminar "${itemLabel}"? Esta ação não pode ser revertida.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirm}
        isConfirming={isPending}
      />
    </>
  );
};

export default AdminDeleteButton;

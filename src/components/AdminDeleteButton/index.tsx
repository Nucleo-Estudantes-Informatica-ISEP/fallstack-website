"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import { useUiText } from "@/contexts/UiLanguageContext";
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
  const t = useUiText();

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
      toast.error(t("Não foi possível eliminar."));
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
        aria-label={t("Eliminar {value}", { value: itemLabel })}
        title={disabled ? disabledReason : undefined}
        className="flex items-center text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <FiTrash2 size={16} />
      </button>
      <ConfirmDialog
        isVisible={isVisible}
        setIsVisible={setIsVisible}
        title="Eliminar"
        message={t(
          'Tem a certeza que quer eliminar "{value}"? Esta ação não pode ser revertida.',
          { value: itemLabel }
        )}
        confirmLabel="Eliminar"
        cancelLabel={t("Cancelar")}
        onConfirm={handleConfirm}
        isConfirming={isPending}
      />
    </>
  );
};

export default AdminDeleteButton;

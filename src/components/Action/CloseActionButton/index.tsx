"use client";

import { useMutation } from "@/hooks/useMutation";
import PrimaryButton from "@/components/PrimaryButton";

interface CloseActionButtonProps {
  id: string;
  action: {
    isLive: boolean;
  };
}

const CloseActionButton: React.FC<CloseActionButtonProps> = ({
  id,
  action,
}) => {
  const { mutate, isPending } = useMutation(
    "Não foi possível atualizar o estado da ação."
  );

  const handleToggleIsActionLive = () =>
    mutate(async () => {
      const res = await fetch(`/api/actions/${id}`, {
        method: "PATCH",
      });

      if (!res.ok) {
        throw new Error("Não foi possível atualizar o estado da ação.");
      }

      window.location.reload();
    });

  return (
    <PrimaryButton
      onClick={handleToggleIsActionLive}
      loading={isPending}
      className={`absolute top-24 right-4 h-12 w-32 text-lg font-bold md:right-8 md:w-64 md:text-xl ${
        action.isLive ? "bg-red-500" : "bg-green-500"
      }`}
    >
      {action.isLive ? "Fechar" : "Abrir"} ação
    </PrimaryButton>
  );
};

export default CloseActionButton;

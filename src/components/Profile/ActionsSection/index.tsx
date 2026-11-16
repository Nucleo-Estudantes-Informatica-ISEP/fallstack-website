"use client";

import { FiCheck } from "react-icons/fi";

import type { StudentActionDto } from "@/application/dto/actionDto";

interface ActionsSectionProps {
  actions: StudentActionDto[];
}

const ActionsSection: React.FC<ActionsSectionProps> = ({ actions }) => {
  if (!actions.length)
    return (
      <div className="flex min-h-32 items-center justify-center">
        <p className="text-center text-lg text-gray-400">
          Não há desafios disponíveis...
        </p>
      </div>
    );

  return (
    <ul className="flex flex-col gap-2">
      {actions.map((action) => (
        <li
          key={action.id}
          className="flex items-center justify-between gap-4 rounded-4xl bg-[#2c2c2c] px-7 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">
              {action.altText && !action.done ? action.altText : action.name}
            </p>
            <p className="text-sm text-white">
              {action.altText && !action.done
                ? action.description
                    .split(" ")
                    .map((word) => "?".repeat(word.length))
                    .join(" ")
                : action.description}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-ui-muted">
              {action.points} pontos
            </span>
            <span
              aria-hidden="true"
              className={`flex size-7 items-center justify-center border-[3px] ${action.done ? "border-ui-highlight" : "border-white/70"}`}
            >
              {action.done && <FiCheck className="size-5 text-ui-highlight" />}
            </span>
            <span className="sr-only">
              {action.done ? "Concluído" : "Por concluir"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default ActionsSection;

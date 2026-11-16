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
        <p className="text-center text-lg text-ui-muted">
          Não há desafios disponíveis...
        </p>
      </div>
    );

  return (
    <ul className="flex flex-col gap-1.5">
      {actions.map((action) => {
        const isMasked = !!action.altText && !action.done;

        return (
          <li
            key={action.id}
            className="flex items-center justify-between gap-3 rounded-[1.875rem] bg-ui-surface-raised px-5 py-3 md:gap-6 md:px-7"
          >
            <div className="min-w-0 flex-1 wrap-break-word">
              <p className="font-semibold text-white">
                {isMasked ? action.altText : action.name}
              </p>
              {isMasked ? (
                <p className="text-sm text-ui-muted">
                  <span aria-hidden="true">
                    {action.description
                      .split(" ")
                      .map((word) => "?".repeat(word.length))
                      .join(" ")}
                  </span>
                  <span className="sr-only">
                    Descrição revelada quando concluíres o desafio.
                  </span>
                </p>
              ) : (
                <p className="text-sm text-ui-muted">{action.description}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-ui-muted md:text-sm">
                {action.points === 1 ? "1 ponto" : `${action.points} pontos`}
              </span>
              <span
                className={`flex size-7.5 items-center justify-center border-3 ${action.done ? "border-ui-highlight" : "border-ui-muted"}`}
              >
                {action.done && (
                  <FiCheck
                    className="size-5 text-ui-highlight"
                    aria-hidden="true"
                  />
                )}
                <span className="sr-only">
                  {action.done ? "Concluído" : "Por concluir"}
                </span>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default ActionsSection;

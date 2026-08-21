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
    <ul className="flex flex-col gap-[clamp(7px,0.66vw,7px)]">
      {actions.map((action) => (
        <li
          key={action.id}
          className="group flex flex-wrap items-center justify-between bg-[rgba(44,44,44,1)] p-5 transition hover:bg-gray-800"
          style={{ border: "1px solid #ED8326" }}
        >
          <div className="flex-1">
            <p className="mb-1 font-semibold text-white">
              {action.altText && !action.done ? action.altText : action.name}
            </p>
            <p className="text-sm text-gray-300">
              {action.altText && !action.done
                ? action.description
                    .split(" ")
                    .map((word) => "?".repeat(word.length))
                    .join(" ")
                : action.description}
            </p>
          </div>
          <div className="ml-6 flex flex-shrink-0 items-center gap-2">
            <span className="text-sm text-gray-300">
              {action.points} pontos
            </span>
            <span
              className="flex items-center justify-center"
              style={{
                width: "30px",
                height: "30px",
                borderWidth: "3px",
                borderStyle: "solid",
                borderColor: action.done
                  ? "#ED8326"
                  : "rgba(255, 255, 255, 0.7)",
                backgroundColor: "transparent",
              }}
            >
              {action.done && (
                <FiCheck className="size-5 text-[rgba(237,131,38,1)]" />
              )}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default ActionsSection;

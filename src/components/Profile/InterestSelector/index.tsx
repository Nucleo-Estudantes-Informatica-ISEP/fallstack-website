"use client";

import { FiCheck } from "react-icons/fi";

import type { InterestDto } from "@/application/dto/interestDto";

interface InterestSelectorProps {
  selectedInterestIds: string[];
  availableInterests: InterestDto[];
  setSelectedInterestIds: (interestIds: string[]) => void;
  scrollable?: boolean;
  alignStart?: boolean;
}

const InterestSelector: React.FC<InterestSelectorProps> = ({
  setSelectedInterestIds,
  selectedInterestIds,
  availableInterests,
  scrollable = false,
  alignStart = false,
}) => {
  const toggleInterest = (interestId: string) => {
    if (selectedInterestIds.includes(interestId)) {
      setSelectedInterestIds(
        selectedInterestIds.filter((id) => id !== interestId)
      );
    } else {
      setSelectedInterestIds([...selectedInterestIds, interestId]);
    }
  };

  if (!availableInterests.length) {
    return (
      <div className="my-4 flex w-full items-center justify-center text-sm text-gray-400">
        Não foi possível carregar interesses.
      </div>
    );
  }

  return (
    <div
      className={`flex w-full flex-wrap gap-3 ${alignStart ? "justify-start" : "justify-center"} ${
        scrollable ? "max-h-52 overflow-y-auto pt-1 pr-1" : ""
      }`}
    >
      {availableInterests.map((interest) => {
        const isSelected = selectedInterestIds.includes(interest.id);
        return (
          <button
            type="button"
            key={interest.id}
            aria-pressed={isSelected}
            onClick={() => toggleInterest(interest.id)}
            className={`relative min-h-11 max-w-full cursor-pointer field-focus-target rounded-full border py-2 wrap-anywhere transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${alignStart ? "px-5 field-text sm:px-7" : ""} ${
              isSelected
                ? "border-white bg-white/10 text-white"
                : "border-white/35 text-white/80 hover:border-white/60"
            }`}
          >
            {isSelected && (
              <FiCheck
                aria-hidden="true"
                className="mr-1.5 inline-block size-4 align-text-bottom"
              />
            )}
            {interest.name}
          </button>
        );
      })}
    </div>
  );
};

export default InterestSelector;

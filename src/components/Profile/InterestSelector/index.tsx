"use client";

import type { InterestDto } from "@/application/dto/interestDto";

interface InterestSelectorProps {
  selectedInterestIds: string[];
  availableInterests: InterestDto[];
  setSelectedInterestIds: (interestIds: string[]) => void;
  scrollable?: boolean;
}

const InterestSelector: React.FC<InterestSelectorProps> = ({
  setSelectedInterestIds,
  selectedInterestIds,
  availableInterests,
  scrollable = false,
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
      className={`flex w-full flex-wrap gap-3 ${
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
            className={`relative max-w-full cursor-pointer rounded border px-3 py-2 text-sm wrap-break-word transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              isSelected
                ? "border-white bg-white/10 text-white"
                : "border-white/35 text-white/60 hover:border-white/60"
            }`}
          >
            {interest.name}
          </button>
        );
      })}
    </div>
  );
};

export default InterestSelector;

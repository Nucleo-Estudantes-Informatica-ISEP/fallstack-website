"use client";

import type { InterestDto } from "@/application/dto/interestDto";

interface InterestSelectorProps {
  userInterests: string[];
  availableInterests: InterestDto[];
  setUserInterests: (interests: string[]) => void;
  scrollable?: boolean;
}

const InterestSelector: React.FC<InterestSelectorProps> = ({
  setUserInterests,
  userInterests,
  availableInterests,
  scrollable = false,
}) => {
  const toggleInterest = (interestName: string) => {
    if (userInterests.includes(interestName)) {
      setUserInterests(userInterests.filter((i) => i !== interestName));
    } else {
      setUserInterests([...userInterests, interestName]);
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
        const isSelected = userInterests.includes(interest.name);
        return (
          <button
            type="button"
            key={interest.id ?? interest.name}
            onClick={() => toggleInterest(interest.name)}
            className={`relative cursor-pointer rounded border px-3 py-2 text-sm transition-colors ${
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

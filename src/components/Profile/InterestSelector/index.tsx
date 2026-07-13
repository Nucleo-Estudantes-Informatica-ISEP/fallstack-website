"use client";

import { useEffect, useState } from "react";
import { Interest } from "@prisma/client";

import { BASE_URL } from "@/services/api";

interface InterestSelectorProps {
  userInterests: string[];
  setUserInterests: (interests: string[]) => void;
  scrollable?: boolean;
}

const InterestSelector: React.FC<InterestSelectorProps> = ({
  setUserInterests,
  userInterests,
  scrollable = false,
}) => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInterests() {
      const res = await fetch(BASE_URL + "/interests");
      const json = await res.json();
      setInterests(json);
      setLoading(false);
    }

    fetchInterests();
  }, []);

  const toggleInterest = (interestName: string) => {
    if (userInterests.includes(interestName)) {
      setUserInterests(userInterests.filter((i) => i !== interestName));
    } else {
      setUserInterests([...userInterests, interestName]);
    }
  };

  if (loading) {
    return (
      <div className="my-4 flex w-full animate-pulse items-center justify-center text-sm text-gray-400">
        A carregar interesses...
      </div>
    );
  }

  if (!interests.length) {
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
      {interests.map((interest) => {
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

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
}) => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInterests() {
      try {
        const res = await fetch(BASE_URL + "/interests");
        const json = await res.json();
        setInterests(json);
      } catch (error) {
        console.error("Erro ao carregar interesses", error);
      } finally {
        setLoading(false);
      }
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
    return <div className="text-gray-400 text-sm animate-pulse">A carregar interesses...</div>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {interests.map((interest) => {
        const isSelected = userInterests.includes(interest.name);

        return (
          <button
            key={interest.id} 
            onClick={() => toggleInterest(interest.name)}
            className={`
              flex items-center justify-center 
              border px-4 py-2 text-sm font-medium transition-all duration-200
              ${
                isSelected
                  ? "border-white bg-white text-black" 
                  : "border-white bg-transparent text-white hover:bg-white/10" 
              }
            `}
          >
            {interest.name}
          </button>
        );
      })}
    </div>
  );
};

export default InterestSelector;
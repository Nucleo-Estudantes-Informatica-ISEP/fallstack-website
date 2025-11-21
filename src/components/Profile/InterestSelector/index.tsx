"use client";

import { useEffect, useState } from "react";
import { Interest } from "@prisma/client";
import { Reorder } from "framer-motion";

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

  const orderedInterests = interests.sort((a, b) => {
    if (userInterests.includes(a.name)) return -1;
    if (userInterests.includes(b.name)) return 1;
    return 0;
  });

  return !loading ? (
    <Reorder.Group
      axis="x"
      values={orderedInterests}
      onReorder={(values) => {
        if (values.length !== orderedInterests.length) return;
        setInterests(values);
      }}
      className={`flex w-full flex-wrap gap-x-6 gap-y-4 ${
        scrollable && "h-52 overflow-y-scroll pt-4"
      }`}
    >
      {orderedInterests.map((interest) => (
        <Reorder.Item
          onClick={() => {
            if (userInterests.includes(interest.name)) {
              setUserInterests(
                userInterests.filter((i) => i !== interest.name)
              );
            } else {
              setUserInterests([...userInterests, interest.name]);
          }
          }}
          key={interest.name}
          className={`relative cursor-pointer border h-10 bg-[#141414] px-3 py-1 ${
            userInterests.includes(interest.name)
              ? "border-white text-white"
              : "border-white/35 text-white/35"
          }`}
          value={interest.name}
        >
          {interest.name}
        </Reorder.Item>
      ))}
    </Reorder.Group>
  ) : (
    <div className="my-8 flex w-full items-center justify-center">
      <p className="text-xl font-bold text-white">Loading...</p>
    </div>
  );
};

export default InterestSelector;

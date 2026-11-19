"use client";

import { useUiText } from "@/contexts/UiLanguageContext";

interface InterestsSectionProps {
  userInterests: string[];
}

const InterestsSection: React.FC<InterestsSectionProps> = ({
  userInterests,
}) => {
  const t = useUiText();

  let orderedInterests = userInterests;
  if (userInterests.length > 0) {
    orderedInterests = userInterests.sort((a, b) => {
      if (userInterests.includes(a)) return -1;
      if (userInterests.includes(b)) return 1;
      return 0;
    });
  }

  return (
    <section className="my-4 flex flex-wrap space-y-5 px-12">
      <div className="flex flex-col">
        <h3 className="text-left text-xl font-bold text-gray-600">
          {t("Interesses")}
        </h3>
        <div className="mt-2 flex w-full flex-wrap items-center gap-x-6 gap-y-3">
          {orderedInterests.length === 0 ? (
            <p className="text-center text-lg text-gray-500">
              {t("Ainda não definiste os teus interesses...")}
            </p>
          ) : (
            <>
              {orderedInterests.map((interest) => (
                <div
                  className="relative flex rounded-xl bg-slate-200 px-3 py-1 text-black"
                  key={interest}
                >
                  {interest}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default InterestsSection;

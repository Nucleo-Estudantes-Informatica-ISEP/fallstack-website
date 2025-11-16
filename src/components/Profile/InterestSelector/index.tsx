import { useState } from "react";

interface InterestSelectorProps {
  userInterests: string[] | undefined;
  setUserInterests: (interests: string[]) => void;
}

const AVAILABLE_INTERESTS = [
  "DevOps",
  "Machine Learning",
  "Data Science",
  "Internet of Things",
  "Virtual Reality",
  "Database Management",
  "Mobile Development",
  "Game Development",
  "Cybersecurity",
  "Web Development",
];

const InterestSelector: React.FC<InterestSelectorProps> = ({
  userInterests = [],
  setUserInterests,
}) => {
  
  const toggleInterest = (interest: string) => {
    if (userInterests.includes(interest)) {
      setUserInterests(userInterests.filter((i) => i !== interest));
    } else {
      setUserInterests([...userInterests, interest]);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {AVAILABLE_INTERESTS.map((interest) => {
        const isSelected = userInterests.includes(interest);

        return (
          <button
            key={interest}
            onClick={() => toggleInterest(interest)}
            type="button" // Importante para não submeter o formulário ao clicar
            className={`
              flex w-full items-center justify-center 
              border px-4 py-3 text-sm font-medium transition-all duration-200
              ${
                isSelected
                  ? "border-white bg-white text-black" // Selecionado: Fundo branco, texto preto
                  : "border-white bg-transparent text-white hover:bg-white/10" // Não selecionado: Borda branca, fundo transp. (IGUAL À IMAGEM)
              }
            `}
          >
            {interest}
          </button>
        );
      })}
    </div>
  );
};

export default InterestSelector;
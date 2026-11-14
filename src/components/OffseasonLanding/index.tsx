interface OffseasonLandingProps {
  language: "PT" | "EN";
}

const content = {
  PT: {
    title: "O Fallstack 2026 terminou!",
    description:
      "Obrigado a todos os estudantes, empresas e parceiros que fizeram parte desta edição.",
    next: "Voltamos em breve com novidades sobre a próxima edição.",
    contact: "Até breve!",
  },
  EN: {
    title: "Fallstack 2026 has ended!",
    description:
      "Thank you to all students, companies and partners who took part in this edition.",
    next: "We'll be back soon with news about the next edition.",
    contact: "See you soon!",
  },
};

export default function OffseasonLanding({ language }: OffseasonLandingProps) {
  const text = content[language];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mx-auto max-w-2xl">
        <p className="mb-4 text-sm font-semibold tracking-[0.3em] text-gray-400 uppercase">
          Fallstack 2026
        </p>

        <h1 className="mb-6 text-4xl font-bold tracking-tight text-white md:text-6xl">
          {text.title}
        </h1>

        <p className="mb-4 text-lg leading-relaxed text-gray-300">
          {text.description}
        </p>

        <p className="mb-8 text-base text-gray-400">{text.next}</p>

        <p className="font-semibold text-white">{text.contact}</p>
      </div>
    </main>
  );
}

import Link from "next/link";

import UiText from "@/components/ui/UiText";

export default function Forbidden() {
  return (
    <section
      data-testid="forbidden"
      className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background px-12 text-white"
    >
      <h1 className="text-center text-3xl font-semibold text-white sm:text-4xl">
        <UiText text="Sem permissão" />
      </h1>
      <p className="text-center text-lg text-gray-200">
        <UiText text="Não tens acesso a esta página." />
      </p>
      <Link href="/" className="font-normal text-primary">
        <UiText text="Página inicial" />
      </Link>
    </section>
  );
}

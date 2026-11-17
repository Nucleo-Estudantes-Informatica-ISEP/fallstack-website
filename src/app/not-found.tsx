import Link from "next/link";

import UiText from "@/components/ui/UiText";

export default function Custom404() {
  return (
    <section
      data-testid="not-found"
      className="artwork-clean artwork-readable flex min-h-screen w-full flex-col items-center justify-center gap-6 px-4 text-center"
    >
      <h1 className="text-3xl font-semibold sm:text-4xl md:text-6xl">
        <UiText text="Não encontramos a página que estás à procura..." />
      </h1>
      <p className="text-7xl font-bold text-primary sm:text-8xl">404</p>

      <Link href="/" className="ui-action">
        <UiText text="Página inicial" />
      </Link>
    </section>
  );
}

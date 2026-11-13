import Link from "next/link";

export default function Custom404() {
  return (
    <section
      data-testid="not-found"
      className="artwork-clean artwork-readable flex min-h-screen w-full flex-col items-center justify-center px-4"
    >
      <h1 className="text-center text-3xl font-semibold sm:text-4xl md:text-6xl">
        Não encontramos a página que estás à procura...
      </h1>
      <p className="text-7xl font-bold text-primary sm:text-8xl">404</p>

      <p className="text-center text-2xl font-normal">
        Dica: Experimenta voltar à{" "}
        <Link
          href="/"
          className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Página inicial
        </Link>
      </p>
    </section>
  );
}


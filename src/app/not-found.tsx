import Link from "next/link";

export default function Custom404() {
  return (
    <section className="flex h-screen w-screen flex-col items-center justify-center bg-[url('/assets/images/bgHero.svg')] bg-cover bg-center bg-no-repeat px-12">
      <h1 className="text-center text-3xl font-semibold sm:text-4xl md:text-6xl">
        Não encontramos a página que estás à procura...
      </h1>
      <h1 className="text-primary text-9xl font-bold sm:text-[200px] md:text-[320px]">
        404
      </h1>

      <p className="text-center text-2xl font-thin">
        Dica: Experimenta voltar à{" "}
        <Link href="/" className="text-primary font-normal">
          Página inicial
        </Link>
      </p>
    </section>
  );
}

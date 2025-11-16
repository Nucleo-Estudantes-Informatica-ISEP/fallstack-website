import Link from "next/link";

const HeadsUp: React.FC = () => {
  return (
    <section className="flex w-full flex-col items-center justify-center bg-[url('/assets/images/bgHeadsUp.svg')] bg-cover bg-center bg-no-repeat py-40 text-center">
      <h2 className="text-5xl md:text-8xl">Precisas de ajuda?</h2>

      <p className="my-2 text-center text-lg font-light md:text-2xl">
        Envia-nos um email para{" "}
        <Link href="mailto:support@nei-isep.org">support@nei-isep.org</Link>
      </p>
    </section>
  );
};

export default HeadsUp;

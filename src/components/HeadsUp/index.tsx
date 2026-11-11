"use client";

import Link from "next/link";

const HeadsUp: React.FC = () => {
  return (
    <section className="flex w-full flex-col items-center justify-center bg-[url('/assets/optimized/bgHeadsUp.3127b747c0b8.webp')] bg-cover bg-center bg-no-repeat px-6 py-12 text-center md:py-16">
      <h2 className="text-3xl md:text-4xl">Precisas de ajuda?</h2>

      <p className="my-2 text-center text-base font-light md:text-lg">
        Envia-nos um email para{" "}
        <Link href="mailto:support@nei-isep.org">support@nei-isep.org</Link>
      </p>
    </section>
  );
};

export default HeadsUp;

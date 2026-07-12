"use client";

import { FunctionComponent } from "react";

import FaqContainer from "@/components/Faq/FaqContainer";
import HeadingText from "@/components/HeadingText";
import { FAQ } from "@/utils/FAQ";

const FaqSection: FunctionComponent = () => {
  return (
    <section className="w-full bg-background pb-16">
      <div className="mx-auto flex w-full flex-col gap-10">
        <HeadingText
          text="FAQs"
          className="!mb-0 !text-left text-4xl text-secondary md:!text-5xl"
        />
        <FaqContainer faqs={FAQ} />
      </div>
    </section>
  );
};

export default FaqSection;

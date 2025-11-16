import { FunctionComponent } from "react";

import HeadingText from "@/components/HeadingText";
import { FAQ } from "@/utils/FAQ";

import FaqContainer from "../FaqContainer";

const FaqSection: FunctionComponent = () => {
  return (
    <section className="bg-background w-full pb-16">
      <div className="mx-auto flex w-full flex-col gap-10">
        <HeadingText
          text="FAQs"
          className="text-secondary !mb-0 !text-left text-4xl md:!text-5xl"
        />
        <FaqContainer faqs={FAQ} />
      </div>
    </section>
  );
};

export default FaqSection;

"use client";

import React, { useState } from "react";

import FaqQuestion, { FaqProps } from "../FaqQuestion";

interface FaqContainerProps {
  faqs: FaqProps[];
}
const FaqContainer: React.FC<FaqContainerProps> = ({ faqs }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="mx-auto flex w-full flex-col gap-4">
      {faqs.map((faq) => (
        <FaqQuestion
          key={faq.question}
          question={faq.question}
          answer={faq.answer}
          index={faq.index}
          isOpen={activeIndex === faq.index}
          onToggle={() => handleToggle(faq.index)}
        />
      ))}
    </div>
  );
};

export default FaqContainer;

"use client";

import { AnimatePresence, motion } from "framer-motion";

import { Chevron } from "@/styles/Icons";

export interface FaqProps {
  question: string;
  answer: string;
  index: number;
}

interface FaqQuestionProps extends FaqProps {
  isOpen: boolean;
  onToggle: () => void;
}

const FaqQuestion: React.FC<FaqQuestionProps> = ({
  question,
  answer,
  index,
  isOpen,
  onToggle,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.05, 0.4) }}
      className={`border-secondary w-full border transition-colors duration-200`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-6 px-6 py-6 text-left text-base font-semibold text-white transition-colors duration-200 sm:px-8 sm:py-8 sm:text-lg"
      >
        <span className="flex-1 text-xl leading-tight sm:text-2xl md:text-3xl">
          {question}
        </span>
        <Chevron isOpen={isOpen} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="faq-answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-6 text-justify text-base leading-relaxed sm:px-8 sm:pb-8 sm:text-lg">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FaqQuestion;

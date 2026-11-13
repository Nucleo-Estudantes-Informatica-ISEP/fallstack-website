"use client";

import React, { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface QRCodeTabProps {
  tabs: React.ReactNode[];
  tabTitles: string[];
  setTitleIndex: React.Dispatch<React.SetStateAction<number>>;
}

const QRCodeTab: React.FC<QRCodeTabProps> = ({
  tabs,
  tabTitles,
  setTitleIndex,
}) => {
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const tabsId = useId();

  const tabVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const handleChangeTab = (index: number) => {
    setSelectedTab(index);
    setTitleIndex(index);
  };

  return (
    <div className="lg:pt-6">
      <div
        role="tablist"
        aria-label="Navegação do QR Code"
        className="flex justify-center"
        onKeyDown={(event) => {
          const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];

          if (!keys.includes(event.key)) return;

          event.preventDefault();

          const lastIndex = tabTitles.length - 1;
          if (lastIndex < 0) return;

          let nextIndex = selectedTab;

          if (event.key === "ArrowRight") {
            nextIndex = (selectedTab + 1) % tabTitles.length;
          } else if (event.key === "ArrowLeft") {
            nextIndex = (selectedTab - 1 + tabTitles.length) % tabTitles.length;
          } else if (event.key === "Home") {
            nextIndex = 0;
          } else if (event.key === "End") {
            nextIndex = lastIndex;
          }

          handleChangeTab(nextIndex);

          const buttons =
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              '[role="tab"]'
            );

          buttons[nextIndex]?.focus();
        }}
      >
        {tabTitles.map((title, index) => (
          <button
            key={title}
            id={`${tabsId}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={selectedTab === index}
            aria-controls={`${tabsId}-panel-${index}`}
            tabIndex={selectedTab === index ? 0 : -1}
            className={`ui-focus min-h-11 rounded-t-md px-4 py-2 transition-colors ${
              selectedTab === index
                ? "border-b-2 border-primary text-primary"
                : "text-gray-800 hover:text-primary"
            }`}
            onClick={() => handleChangeTab(index)}
          >
            {title}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTab}
          id={`${tabsId}-panel-${selectedTab}`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-tab-${selectedTab}`}
          tabIndex={0}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={tabVariants}
        >
          {tabs[selectedTab]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default QRCodeTab;

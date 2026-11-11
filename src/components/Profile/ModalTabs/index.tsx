"use client";

import React, { useId } from "react";

import useTabWidth from "@/hooks/useTabWidth";

interface ModalTabsProps {
  activeTabIndex: number;
  setActiveTabIndex: React.Dispatch<React.SetStateAction<number>>;
  hasDetailsSection: boolean;
  hasLinksSection: boolean;
  hasVideoSection: boolean;
}

const ModalTabs: React.FC<ModalTabsProps> = ({
  activeTabIndex,
  setActiveTabIndex,
  hasDetailsSection,
  hasLinksSection,
  hasVideoSection,
}) => {
  const [tabWidth] = useTabWidth(
    hasDetailsSection,
    hasLinksSection,
    hasVideoSection
  );

  const tabsId = useId();

  const tabs = [
    { index: 0, title: "Detalhes", visible: hasDetailsSection },
    { index: 1, title: "Links", visible: hasLinksSection },
    { index: 2, title: "Vídeo", visible: hasVideoSection },
  ].filter((tab) => tab.visible);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
      return;
    }

    if (tabs.length === 0) return;

    event.preventDefault();

    const currentPosition = tabs.findIndex(
      (tab) => tab.index === activeTabIndex
    );

    let nextPosition = currentPosition;

    if (event.key === "ArrowRight") {
      nextPosition = (currentPosition + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextPosition = (currentPosition - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextPosition = 0;
    } else if (event.key === "End") {
      nextPosition = tabs.length - 1;
    }

    const nextTab = tabs[nextPosition];

    if (!nextTab) return;

    setActiveTabIndex(nextTab.index);

    const buttons =
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');

    buttons[nextPosition]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Secções do perfil"
      onKeyDown={handleKeyDown}
      className="relative mx-auto flex w-full flex-col items-center justify-between md:flex-row"
    >
      <div
        className={`absolute top-28 left-0 ${tabWidth} bg-modal-accent mt-2 mr-2 hidden h-1 rounded-lg transition-transform duration-300 ease-in-out hover:brightness-90 sm:block ${
          activeTabIndex === 0
            ? "md:translate-x-0"
            : activeTabIndex === 1
              ? "md:translate-x-full"
              : "md:translate-x-200"
        }`}
        aria-hidden="true"
      />

      {tabs.map(({ index, title }) => (
        <button
          key={index}
          id={`${tabsId}-tab-${index}`}
          type="button"
          role="tab"
          aria-selected={activeTabIndex === index}
          tabIndex={activeTabIndex === index ? 0 : -1}
          onClick={() => setActiveTabIndex(index)}
          className={`ui-focus z-10 mx-4 min-h-11 flex-1 cursor-pointer rounded-lg px-3 py-2 text-center text-lg transition-colors ${
            activeTabIndex === index
              ? "text-modal-active font-semibold"
              : "hover:bg-modal-hover-accent font-normal text-black"
          }`}
        >
          {title}
        </button>
      ))}
    </div>
  );
};

export default ModalTabs;

"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";

import type { IconType } from "react-icons";

export interface DashboardNavItem {
  key: string;
  label: string;
  icon: IconType;
  /** Leaves the shell for another page; without it the item selects a panel. */
  href?: string;
}

interface DashboardShellProps {
  /** Avatar, name and email block shown on the artwork above the menu. */
  header: React.ReactNode;
  navLabel: string;
  items: DashboardNavItem[];
  secondaryItems?: DashboardNavItem[];
  selectedKey: string;
  onSelect: (item: DashboardNavItem) => void;
  /** Lets the caller move focus to the panel, for example after a refresh. */
  contentRef?: React.RefObject<HTMLDivElement>;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const horizontalPadding = "mx-auto w-full max-w-[77.5rem] px-4 sm:px-8";

const itemClass = (isCurrent: boolean) =>
  `${isCurrent ? "hidden lg:flex" : "flex"} min-h-12 w-full items-center justify-between gap-2 rounded-full border bg-background px-6 py-2 text-left text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isCurrent ? "border-primary" : "border-secondary hover:border-white/60"}`;

/**
 * Header text on the artwork: the name in Coolvetica, the second line in
 * Inter. Callers add anything else (a notice, for example) as children.
 */
export const DashboardHeader: React.FC<{
  avatar?: React.ReactNode;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}> = ({ avatar, title, subtitle, children }) => (
  <div
    className={`flex flex-col items-center pt-20 pb-6 lg:pb-16 ${horizontalPadding}`}
  >
    {avatar}
    <h1 className="mb-2 max-w-full text-center font-title text-[clamp(2rem,5vw,2.8125rem)] leading-none font-normal wrap-break-word text-white">
      {title}
    </h1>
    <p className="max-w-full text-center text-xl leading-none font-normal break-all text-gray-100">
      {subtitle}
    </p>
    {children}
  </div>
);

/**
 * The dashboard frame: artwork page, header, left menu and dark content card.
 * Below lg the selected panel comes first, under a label naming it, and its
 * menu entry is hidden; the rest of the menu follows.
 */
const DashboardShell: React.FC<DashboardShellProps> = ({
  header,
  navLabel,
  items,
  secondaryItems = [],
  selectedKey,
  onSelect,
  contentRef,
  className = "artwork-clean artwork-readable bg-cover bg-top",
  style,
  children,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const ownContentRef = useRef<HTMLDivElement>(null);
  const panelRef = contentRef ?? ownContentRef;
  const previousKey = useRef(selectedKey);

  // A new selection moves focus to its content, so keyboard users do not
  // tab through the rest of the menu. Focusing alone would leave a phone
  // user at the end of a tall panel (the menu sits under it below lg), or
  // with its top under the fixed top bar, so jump to the panel's start
  // when that is out of view.
  useEffect(() => {
    if (previousKey.current === selectedKey) return;
    previousKey.current = selectedKey;
    panelRef.current?.focus({ preventScroll: true });

    const section = sectionRef.current;
    if (!section) return;
    // The page scrolls smoothly, so the scroll that brought the menu entry
    // into view can still be running. Left alone, it carries on past the new
    // panel after this check. Stop it where it is first.
    window.scrollTo({ top: window.scrollY, behavior: "instant" });
    const top = section.getBoundingClientRect().top;
    const topBar = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
    if (top < topBar || top > window.innerHeight)
      section.scrollIntoView({ block: "start", behavior: "instant" });
  }, [selectedKey, panelRef]);

  const selectedLabel =
    [...items, ...secondaryItems].find((item) => item.key === selectedKey)
      ?.label ?? navLabel;

  const renderItem = (item: DashboardNavItem) => {
    const isCurrent = selectedKey === item.key;
    const content = (
      <>
        <span className="flex items-center gap-3">
          <item.icon className="size-5" aria-hidden />
          <span>{item.label}</span>
        </span>
        <FiChevronRight className="size-4" aria-hidden />
      </>
    );

    if (item.href)
      return (
        <Link
          key={item.key}
          href={item.href}
          prefetch={false}
          aria-current={isCurrent ? "page" : undefined}
          className={itemClass(isCurrent)}
        >
          {content}
        </Link>
      );

    return (
      <button
        key={item.key}
        type="button"
        onClick={() => onSelect(item)}
        aria-current={isCurrent ? "true" : undefined}
        className={itemClass(isCurrent)}
      >
        {content}
      </button>
    );
  };

  return (
    <div
      className={`flex min-h-screen w-full flex-col bg-background ${className}`}
      style={style}
    >
      {header}
      <div
        className={`flex flex-1 flex-col gap-6 pb-20 lg:flex-row lg:gap-1.5 ${horizontalPadding}`}
      >
        <div
          ref={sectionRef}
          className="min-w-0 flex-1 field-focus-target lg:order-2"
        >
          <p className="mb-1 rounded-full border border-primary bg-background px-6 py-3 text-sm lg:hidden">
            {selectedLabel}
          </p>
          <div
            ref={panelRef}
            tabIndex={-1}
            role="region"
            aria-label={selectedLabel}
            className="min-w-0 border border-secondary bg-background p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6 xl:p-11"
          >
            {children}
          </div>
        </div>
        <div className="w-full shrink-0 lg:order-1 lg:w-64 xl:w-88.5">
          <nav aria-label={navLabel} className="flex flex-col gap-1">
            {items.map(renderItem)}
            {secondaryItems.map(renderItem)}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default DashboardShell;

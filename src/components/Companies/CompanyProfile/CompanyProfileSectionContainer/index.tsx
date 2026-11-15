"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BiScan } from "react-icons/bi";
import { FiChevronRight, FiFileText, FiLogOut } from "react-icons/fi";

import type { Stats } from "@/types/Stats";
import { httpClient } from "@/lib/http/client";
import { useLogout } from "@/hooks/useLogout";
import CompanyImage from "@/components/Companies/CompanyProfile/CompanyImage";
import CompanySavedProfilesSection from "@/components/Companies/CompanyProfile/CompanySavedProfilesSection";
import CompanyStatsSection from "@/components/Companies/CompanyProfile/CompanyStatsSection";
import type { CompanyDto } from "@/application/dto/companyDto";
import type { SavedStudentDto } from "@/application/dto/historyDto";
import type { InterestDto } from "@/application/dto/interestDto";

import { IconType } from "react-icons";

interface CompanyProfileSectionContainerProps {
  company: CompanyDto;
  employeeName: string;
  globalStats: Stats;
  totalStudents: number;
  history: SavedStudentDto[];
  historyHasMore: boolean;
  interestIds: string[];
  availableInterests: InterestDto[];
}

type MenuKey = "sumario" | "scan_perfil" | "logout";

interface SidebarItem {
  key: MenuKey;
  label: string;
  icon: IconType;
}

// Employees only get their company's summary, the profile scanner and
// logout: no student pass/challenges and no staff (attendance) actions.
const sidebarItems: SidebarItem[] = [
  { key: "sumario", label: "Sumário", icon: FiFileText },
  { key: "scan_perfil", label: "Scan de Perfil", icon: BiScan },
];

const secondaryItems: SidebarItem[] = [
  { key: "logout", label: "Logout", icon: FiLogOut },
];

// Same layout and styles as the student dashboard
// (src/components/Profile/ProfileSectionContainer), kept as separate code.
const CompanyProfileSectionContainer: React.FC<
  CompanyProfileSectionContainerProps
> = ({
  company,
  employeeName,
  globalStats,
  totalStudents,
  history,
  historyHasMore,
  interestIds,
  availableInterests,
}) => {
  const { handleLogout, ConfirmDialog } = useLogout();
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousMenu = useRef<MenuKey>("sumario");
  const [items, setItems] = useState(history);
  const [hasMore, setHasMore] = useState(historyHasMore);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const historyGeneration = useRef(0);
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const wasLoadingHistory = useRef(false);

  useLayoutEffect(() => {
    historyGeneration.current += 1;
    setItems(history);
    setHasMore(historyHasMore);
    setLoadingHistory(false);
    setHistoryError(false);
    return () => {
      historyGeneration.current += 1;
    };
  }, [history, historyHasMore]);

  const loadMore = async () => {
    const last = items.at(-1);
    if (!last || loadingHistory) return;
    const generation = historyGeneration.current;
    setLoadingHistory(true);
    setHistoryError(false);
    try {
      const query = new URLSearchParams({
        studentId: last.studentId,
        createdAt: last.createdAt,
      });
      const page = await httpClient.get<{
        items: SavedStudentDto[];
        hasMore: boolean;
      }>(`/companies/history/page?${query}`);
      if (generation !== historyGeneration.current) return;
      setItems((current) => [
        ...current,
        ...page.items.filter(
          (item) =>
            !current.some((existing) => existing.studentId === item.studentId)
        ),
      ]);
      setHasMore(page.hasMore);
    } catch {
      if (generation === historyGeneration.current) setHistoryError(true);
    } finally {
      if (generation === historyGeneration.current) setLoadingHistory(false);
    }
  };

  // Loading disables "Carregar mais", which drops keyboard focus to the
  // page. Put it back on the button, or on the panel once the last page
  // has loaded and the button is gone.
  useEffect(() => {
    const finished = wasLoadingHistory.current && !loadingHistory;
    wasLoadingHistory.current = loadingHistory;
    const active = document.activeElement;
    if (!finished || (active && active !== document.body)) return;
    (loadMoreRef.current ?? contentRef.current)?.focus();
  }, [loadingHistory]);

  const [selectedMenu, setSelectedMenu] =
    useState<Exclude<MenuKey, "logout">>("sumario");

  // A new selection moves focus to its content, so keyboard users do not
  // tab through the rest of the menu. Focusing alone would leave a phone
  // user at the end of a tall panel (the menu sits under it below lg), or
  // with its top under the fixed top bar, so jump to the panel's start
  // when that is out of view.
  useEffect(() => {
    if (previousMenu.current === selectedMenu) return;
    previousMenu.current = selectedMenu;
    contentRef.current?.focus({ preventScroll: true });

    const section = sectionRef.current;
    if (!section) return;
    const top = section.getBoundingClientRect().top;
    const topBar = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
    if (top < topBar || top > window.innerHeight)
      section.scrollIntoView({ block: "start", behavior: "instant" });
  }, [selectedMenu]);

  const handleMenuClick = (item: SidebarItem) => {
    if (item.key === "logout") {
      handleLogout();
      return;
    }
    setSelectedMenu(item.key);
  };

  const renderButton = (item: SidebarItem) => {
    const isCurrent = selectedMenu === item.key;

    return (
      <button
        key={item.key}
        onClick={() => handleMenuClick(item)}
        type="button"
        aria-current={isCurrent ? "true" : undefined}
        className={`${isCurrent ? "hidden lg:flex" : "flex"} min-h-12 w-full items-center justify-between gap-2 rounded-full border bg-background px-6 py-2 text-left text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isCurrent ? "border-primary" : "border-secondary hover:border-white/60"}`}
      >
        <div className="flex items-center gap-3">
          <item.icon className="size-5" aria-hidden />
          <span>{item.label}</span>
        </div>
        <FiChevronRight className="size-4" aria-hidden />
      </button>
    );
  };

  const selectedLabel =
    sidebarItems.find((item) => item.key === selectedMenu)?.label ?? "Sumário";

  const horizontalPadding = "mx-auto w-full max-w-[77.5rem] px-4 sm:px-8";

  const pagination = (
    <div className="flex flex-col items-center gap-2 pb-6 text-white">
      {historyError && (
        <p role="alert">Não foi possível carregar mais perfis.</p>
      )}
      {hasMore && (
        <button
          ref={loadMoreRef}
          type="button"
          onClick={loadMore}
          disabled={loadingHistory}
          aria-busy={loadingHistory}
          className="ui-action field-focus-target text-sm"
        >
          {loadingHistory ? "A carregar..." : "Carregar mais"}
        </button>
      )}
    </div>
  );

  const renderContent = () => {
    switch (selectedMenu) {
      case "sumario":
        return (
          <>
            <CompanyStatsSection
              stats={globalStats}
              students={totalStudents}
              history={items}
              interestIds={interestIds}
              availableInterests={availableInterests}
            />
            {pagination}
          </>
        );
      case "scan_perfil":
        return (
          <>
            <CompanySavedProfilesSection history={items} />
            {pagination}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="artwork-clean artwork-readable flex min-h-screen w-full flex-col bg-background bg-cover bg-top">
      <div
        className={`flex flex-col items-center pt-20 pb-10 lg:pb-16 ${horizontalPadding}`}
      >
        {company.avatar?.trim() && (
          <div className="relative mb-6 flex w-48 max-w-full items-center justify-center lg:w-64">
            <CompanyImage company={company} />
          </div>
        )}
        <h1
          className="mb-2 max-w-full text-center wrap-break-word text-white"
          style={{
            fontFamily: '"Coolvetica", sans-serif',
            fontWeight: 400,
            fontSize: "45px",
            lineHeight: "100%",
            letterSpacing: "0%",
          }}
        >
          {company.name}
        </h1>
        <p
          className="max-w-full text-center wrap-break-word text-gray-100"
          style={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 400,
            fontSize: "20px",
            lineHeight: "100%",
            letterSpacing: "0%",
          }}
        >
          {employeeName}
        </p>
      </div>

      <div
        className={`flex flex-1 flex-col gap-6 pb-20 lg:flex-row lg:gap-1.5 ${horizontalPadding}`}
      >
        {/* Below lg the selected content comes first, under a label naming
            it, and its menu entry is hidden; the menu follows. */}
        <div
          ref={sectionRef}
          className="min-w-0 flex-1 field-focus-target lg:order-2"
        >
          <p className="mb-1 rounded-full border border-primary bg-background px-6 py-3 text-sm lg:hidden">
            {selectedLabel}
          </p>
          <div
            ref={contentRef}
            tabIndex={-1}
            role="region"
            aria-label={selectedLabel}
            className="min-w-0 border border-secondary bg-background p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6 xl:p-11"
          >
            {renderContent()}
          </div>
        </div>
        <div className="w-full shrink-0 lg:order-1 lg:w-64 xl:w-88.5">
          <nav aria-label="Painel da empresa" className="flex flex-col gap-1">
            {sidebarItems.map(renderButton)}
            {secondaryItems.map(renderButton)}
          </nav>
        </div>
      </div>
      {ConfirmDialog}
    </div>
  );
};

export default CompanyProfileSectionContainer;

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BiScan } from "react-icons/bi";
import { FiFileText, FiLogOut } from "react-icons/fi";

import type { Stats } from "@/types/Stats";
import { httpClient } from "@/lib/http/client";
import { useLogout } from "@/hooks/useLogout";
import CompanyImage from "@/components/Companies/CompanyProfile/CompanyImage";
import CompanySavedProfilesSection from "@/components/Companies/CompanyProfile/CompanySavedProfilesSection";
import CompanyStatsSection from "@/components/Companies/CompanyProfile/CompanyStatsSection";
import DashboardShell, {
  DashboardHeader,
  type DashboardNavItem,
} from "@/components/DashboardShell";
import type { CompanyDto } from "@/application/dto/companyDto";
import type { SavedStudentDto } from "@/application/dto/historyDto";
import type { InterestDto } from "@/application/dto/interestDto";

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

interface SidebarItem extends DashboardNavItem {
  key: MenuKey;
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
  const contentRef = useRef<HTMLDivElement>(null);
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

  const handleMenuClick = (item: SidebarItem) => {
    if (item.key === "logout") {
      handleLogout();
      return;
    }
    setSelectedMenu(item.key);
  };

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
    <>
      <DashboardShell
        header={
          <DashboardHeader
            avatar={
              company.avatar?.trim() ? (
                <div className="relative mb-6 flex w-48 max-w-full items-center justify-center lg:w-64">
                  <CompanyImage company={company} />
                </div>
              ) : undefined
            }
            title={company.name}
            subtitle={employeeName}
          />
        }
        navLabel="Painel da empresa"
        items={sidebarItems}
        secondaryItems={secondaryItems}
        selectedKey={selectedMenu}
        onSelect={(item) => handleMenuClick(item as SidebarItem)}
        contentRef={contentRef}
      >
        {renderContent()}
      </DashboardShell>
      {ConfirmDialog}
    </>
  );
};

export default CompanyProfileSectionContainer;

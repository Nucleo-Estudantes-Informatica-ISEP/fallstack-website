"use client";

import { useState } from "react";
import { BiScan } from "react-icons/bi";
import { FiChevronRight, FiFileText, FiLogOut } from "react-icons/fi";

import type { Stats } from "@/types/Stats";
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
  interestIds,
  availableInterests,
}) => {
  const { handleLogout, ConfirmDialog } = useLogout();

  const [selectedMenu, setSelectedMenu] =
    useState<Exclude<MenuKey, "logout">>("sumario");

  const handleMenuClick = (item: SidebarItem) => {
    if (item.key === "logout") {
      handleLogout();
      return;
    }
    // Focus stays on the pressed entry and the page does not move.
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
        className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-full border bg-background px-6 py-2 text-left text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isCurrent ? "border-primary" : "border-secondary hover:border-white/60"}`}
      >
        <div className="flex items-center gap-3">
          <item.icon className="size-5" aria-hidden />
          <span>{item.label}</span>
        </div>
        <FiChevronRight className="size-4" aria-hidden />
      </button>
    );
  };

  const horizontalPadding = "mx-auto w-full max-w-[77.5rem] px-4 sm:px-8";

  const renderContent = () => {
    switch (selectedMenu) {
      case "sumario":
        return (
          <CompanyStatsSection
            stats={globalStats}
            students={totalStudents}
            history={history}
            interestIds={interestIds}
            availableInterests={availableInterests}
          />
        );
      case "scan_perfil":
        return <CompanySavedProfilesSection history={history} />;
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
        <div className="w-full shrink-0 lg:w-64 xl:w-88.5">
          <nav aria-label="Painel da empresa" className="flex flex-col gap-1">
            {sidebarItems.map(renderButton)}
            {secondaryItems.map(renderButton)}
          </nav>
        </div>

        <div className="min-w-0 flex-1 border border-secondary bg-background p-4 sm:p-6 xl:p-11">
          {renderContent()}
        </div>
      </div>
      {ConfirmDialog}
    </div>
  );
};

export default CompanyProfileSectionContainer;

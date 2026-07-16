"use client";

import { useEffect, useState } from "react";
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
  interests: string[];
  availableInterests: InterestDto[];
}

type TabValue = "Sumário" | "Scan de Perfil";

type MenuKey = "sumario" | "scan_perfil" | "logout";

interface SidebarItem {
  key: MenuKey;
  label: string;
  icon: IconType;
  tabValue?: TabValue;
}

const menuMap: Record<TabValue, MenuKey> = {
  Sumário: "sumario",
  "Scan de Perfil": "scan_perfil",
};

const CompanyProfileSectionContainer: React.FC<
  CompanyProfileSectionContainerProps
> = ({
  company,
  employeeName,
  globalStats,
  totalStudents,
  history,
  interests,
  availableInterests,
}) => {
  const handleLogout = useLogout();

  const [activeTab, setActiveTab] = useState<TabValue>("Sumário");
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>(menuMap[activeTab]);

  useEffect(() => {
    setSelectedMenu(menuMap[activeTab]);
  }, [activeTab]);

  const sidebarItems: SidebarItem[] = [
    { key: "sumario", label: "Sumário", icon: FiFileText, tabValue: "Sumário" },
    {
      key: "scan_perfil",
      label: "Scan de Perfil",
      icon: BiScan,
      tabValue: "Scan de Perfil",
    },
  ];

  const secondaryItems: SidebarItem[] = [
    { key: "logout", label: "Logout", icon: FiLogOut },
  ];

  const handleMenuClick = (item: SidebarItem) => {
    setSelectedMenu(item.key);
    if (item.tabValue) {
      setActiveTab(item.tabValue);
    }
  };

  const renderButton = (item: SidebarItem) => {
    const isCurrent = selectedMenu === item.key;

    return (
      <button
        key={item.key}
        onClick={() =>
          item.key === "logout" ? handleLogout() : handleMenuClick(item)
        }
        className="flex h-12 w-full items-center justify-between px-6 py-3 text-left text-white transition"
        style={{
          border: "1px solid #484848",
          backgroundColor: "rgba(20,20,20,1)",
          borderLeftWidth: isCurrent ? "4px" : "1px",
          borderLeftColor: isCurrent ? "#ED8326" : "#484848",
        }}
      >
        <div className="flex items-center gap-3">
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </div>
        <FiChevronRight className="h-4 w-4" />
      </button>
    );
  };

  const horizontalPadding = "clamp(20px, 11.11vw, 168px)";

  const renderContent = () => {
    switch (activeTab) {
      case "Sumário":
        return (
          <CompanyStatsSection
            stats={globalStats}
            students={totalStudents}
            history={history}
            interests={interests}
            availableInterests={availableInterests}
          />
        );
      case "Scan de Perfil":
        return <CompanySavedProfilesSection history={history} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="flex min-h-screen w-screen flex-col"
      style={{
        backgroundImage: "url(/assets/images/bgHero.svg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
      }}
    >
      <div
        className="flex flex-col items-center pt-12 pb-8"
        style={{
          paddingLeft: horizontalPadding,
          paddingRight: horizontalPadding,
        }}
      >
        <div className="relative mb-6 flex items-center justify-center">
          <CompanyImage company={company} />
        </div>
        <h1
          className="mb-2 text-center text-white"
          style={{
            fontFamily: '"Coolvetica", sans-serif',
            fontWeight: 400,
            fontSize: "45px",
            lineHeight: "100%",
            letterSpacing: "0%",
          }}
        >
          {company.name} - {employeeName}
        </h1>
      </div>

      <div
        className="flex flex-1 flex-col gap-6 pb-20 md:flex-row md:gap-2"
        style={{
          paddingLeft: horizontalPadding,
          paddingRight: horizontalPadding,
        }}
      >
        <div className="w-full flex-shrink-0 md:w-96">
          <nav className="overflow-hidden bg-black shadow-xl">
            <div className="divide-y divide-gray-800">
              {sidebarItems.map((item) => renderButton(item))}
            </div>
          </nav>
          <div style={{ height: "8px" }} />
          <nav className="overflow-hidden bg-black shadow-xl">
            <div className="divide-y divide-gray-800">
              {secondaryItems.map((item) => renderButton(item))}
            </div>
          </nav>
        </div>

        <div
          className="flex flex-1 flex-col bg-[rgba(20,20,20,1)] p-8 shadow-xl"
          style={{
            marginLeft: "clamp(0px, 0.26vw, 0px)",
            border: "1px solid #484848",
          }}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default CompanyProfileSectionContainer;

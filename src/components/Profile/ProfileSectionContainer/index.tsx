"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Action, Student, User } from "@prisma/client";
import {
  FiChevronRight,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMapPin,
  FiSettings,
  FiUser,
} from "react-icons/fi";
import swal from "sweetalert";

import { ProfileData } from "@/types/ProfileData";
import { SavedStudentWithSavedBy } from "@/types/SavedStudentWithSavedBy";
import useSession from "@/hooks/useSession";
import { BASE_URL } from "@/services/api";
import PassMenuContent from "@/components/PassSection/PassMenuContent";
import UserImage from "@/components/Profile/UserImage";
import { Github, Linkedin } from "@/styles/Icons";

import ActionsSection from "../ActionsSection";
import ProfileSection from "../ProfileSection";
import SettingsSection from "../SettingsSection";
import StatsSection from "../StatsSection";

import { IconType } from "react-icons";

const tabs = ["Sumário", "Perfil", "Desafios", "Definições"] as const;
type TabValue = (typeof tabs)[number];

interface ProfileSectionContainerProps {
  student: Student & { user: User };
  interests: string[];
  globalStats: number[];
  todayStats: number;
  companiesLeft: number;
  historyData: SavedStudentWithSavedBy[];
  actions: (Action & { done: boolean })[];
}

const menuMap: Record<TabValue, MenuKey> = {
  Sumário: "sumario",
  Perfil: "info",
  Desafios: "desafios",
  Definições: "definicoes",
};

const ProfileSectionContainer: React.FC<ProfileSectionContainerProps> = ({
  student,
  interests,
  globalStats,
  todayStats,
  companiesLeft,
  historyData,
  actions,
}) => {
  const router = useRouter();
  const session = useSession();

  const [activeTab, setActiveTab] = useState<TabValue>("Sumário");
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>(menuMap[activeTab]);

  useEffect(() => {
    setSelectedMenu(menuMap[activeTab]);
  }, [activeTab]);

  const [profile, setProfile] = useState<ProfileData>({
    interests,
    bio: student.bio,
    linkedin: student.linkedin,
    github: student.github,
    cv: student.cv,
    avatar: null,
  });

  const sidebarItems: SidebarItem[] = [
    { key: "sumario", label: "Sumário", icon: FiFileText, tabValue: "Sumário" },
    // show Passe only if current session user is the profile student
    ...(session.user?.student?.code
      ? ([
          { key: "passe", label: "Passe do FallStack", icon: FiGrid },
        ] as SidebarItem[])
      : []),
    {
      key: "desafios",
      label: "Desafios",
      icon: FiMapPin,
      tabValue: "Desafios",
    },
    {
      key: "info",
      label: "Informações pessoais",
      icon: FiUser,
      tabValue: "Perfil",
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

  const handleLogout = async () => {
    swal("Queres mesmo mesmo sair?", {
      buttons: ["Cancelar", "Sair"],
      title: "Terminar sessão",
      icon: "warning",
      dangerMode: true,
      timer: 5000,
    }).then(async (value) => {
      if (value) {
        const res = await fetch(BASE_URL + "/auth/logout", { method: "POST" });
        if (res.status === 200) {
          session.clear();
          swal("Logout", "Sessão terminada com sucesso", "success");
          router.push("/");
        }
      }
    });
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
    if (selectedMenu === "passe")
      return (
        <PassMenuContent user={student.user} code={student.code ?? null} />
      );

    switch (activeTab) {
      case "Sumário":
        return (
          <StatsSection
            stats={globalStats}
            companiesLeft={companiesLeft}
            historyData={historyData}
          />
        );
      case "Perfil":
        return (
          <ProfileSection
            student={student}
            profile={profile}
            setProfile={setProfile}
            setActiveTab={setActiveTab}
          />
        );
      case "Desafios":
        return (
          <>
            <h2
              className="text-3xl font-bold text-white"
              style={{
                marginBottom: "clamp(13px, 1.22vw, 13px)",
              }}
            >
              Desafios
            </h2>
            <ActionsSection actions={actions} />
          </>
        );
      case "Definições":
        return (
          <SettingsSection
            student={student}
            profile={profile}
            setProfile={setProfile}
            setActiveTab={setActiveTab}
          />
        );
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
          <UserImage imageSrc={student.avatar} className="size-52" />
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
          {student.name}
        </h1>
        <p
          className="text-gray-100"
          style={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 400,
            fontSize: "20px",
            lineHeight: "100%",
            letterSpacing: "0%",
            marginBottom: "clamp(13px, 6.25vw, 63px)",
          }}
        >
          {student.user.email}
        </p>
        {/*
        <p className="p-2 text-center text-white">
          O teu perfil já foi gravado{" "}
          <span className="font-bold text-[#ED8326]">{todayStats} vezes</span>{" "}
          hoje.
        </p>
        <p className="flex gap-x-4 pt-6">
          {profile.github && (
            <a href={profile.github} target="_blank" rel="noopener noreferrer">
              <Github className="size-10 md:size-8" />
            </a>
          )}
          {profile.linkedin && (
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Linkedin className="size-10 md:size-8" />
            </a>
          )}
        </p>
        */}
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

type MenuKey =
  | "sumario"
  | "passe"
  | "desafios"
  | "info"
  | "definicoes"
  | "logout";

interface SidebarItem {
  key: MenuKey;
  label: string;
  icon: IconType;
  tabValue?: TabValue;
}

export default ProfileSectionContainer;

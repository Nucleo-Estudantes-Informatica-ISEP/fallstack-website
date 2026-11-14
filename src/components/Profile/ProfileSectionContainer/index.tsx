"use client";

import { useEffect, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import {
  FiAlertTriangle,
  FiChevronRight,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMapPin,
  FiUser,
} from "react-icons/fi";
import { toast } from "react-toastify";

import { ProfileData } from "@/types/ProfileData";
import type { Stats } from "@/types/Stats";
import { useLogout } from "@/hooks/useLogout";
import useSession from "@/hooks/useSession";
import Modal from "@/components/ui/Modal";
import PrimaryButton from "@/components/ui/PrimaryButton";
import PassMenuContent from "@/components/PassSection/PassMenuContent";
import AvatarCropper from "@/components/Profile/AvatarCropper";
import UserImage from "@/components/Profile/UserImage";
import type { StudentActionDto } from "@/application/dto/actionDto";
import type { SavedStudentDto } from "@/application/dto/historyDto";
import type { InterestDto } from "@/application/dto/interestDto";
import type { StudentDto } from "@/application/dto/studentDto";
import { uploadAvatar } from "@/client/api/upload";
import { getCroppedImg } from "@/utils/canvas";

import ActionsSection from "../ActionsSection";
import ProfileSection from "../ProfileSection";
import SettingsSection from "../SettingsSection";
import StatsSection from "../StatsSection";

import { IconType } from "react-icons";

type TabValue = "Sumário" | "Perfil" | "Desafios" | "Definições";

interface ProfileSectionContainerProps {
  student: StudentDto;
  interestIds: string[];
  globalStats: Stats;
  todayStats: number;
  companiesLeft: number;
  historyData: SavedStudentDto[];
  actions: StudentActionDto[];
  availableInterests: InterestDto[];
}

const menuMap: Record<TabValue, MenuKey> = {
  Sumário: "sumario",
  Perfil: "info",
  Desafios: "desafios",
  Definições: "definicoes",
};

const ProfileSectionContainer: React.FC<ProfileSectionContainerProps> = ({
  student,
  interestIds,
  globalStats,
  companiesLeft,
  historyData,
  actions,
  availableInterests,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousMenu = useRef<MenuKey>("sumario");
  const session = useSession();
  const { handleLogout, ConfirmDialog } = useLogout();

  const [activeTab, setActiveTab] = useState<TabValue>("Sumário");
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>(menuMap[activeTab]);

  useEffect(() => {
    setSelectedMenu(menuMap[activeTab]);
  }, [activeTab]);

  useEffect(() => {
    if (previousMenu.current === selectedMenu) return;
    previousMenu.current = selectedMenu;
    contentRef.current?.focus();
  }, [selectedMenu]);

  const [profile, setProfile] = useState<ProfileData>({
    interests: interestIds,
    bio: student.bio,
    linkedin: student.linkedin,
    github: student.github,
    cv: student.cv,
    avatar: null,
  });

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const isPersonalInfo = selectedMenu === "info";

  const confirmAvatar = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsAvatarLoading(true);
    try {
      const image = await getCroppedImg(imageSrc, croppedAreaPixels);
      const uploaded = image && (await uploadAvatar(image));
      if (!uploaded) {
        toast.error("Não foi possível carregar a imagem.");
        return;
      }
      setProfile((previous) => ({ ...previous, avatar: uploaded.url }));
      setIsAvatarModalVisible(false);
    } catch {
      toast.error("Não foi possível carregar a imagem.");
    } finally {
      setIsAvatarLoading(false);
    }
  };

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

  const renderButton = (item: SidebarItem) => {
    const isCurrent = selectedMenu === item.key;

    return (
      <button
        key={item.key}
        onClick={() =>
          item.key === "logout" ? handleLogout() : handleMenuClick(item)
        }
        type="button"
        aria-current={isCurrent ? "true" : undefined}
        className={`${isCurrent ? "hidden lg:flex" : "flex"} min-h-12 w-full items-center justify-between gap-2 rounded-full border bg-background px-6 py-2 text-left text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isCurrent ? "border-primary" : "border-secondary hover:border-white/60"}`}
      >
        <div className="flex items-center gap-3">
          <item.icon className="size-5" />
          <span>{item.label}</span>
        </div>
        <FiChevronRight className="size-4" />
      </button>
    );
  };

  const horizontalPadding = "mx-auto w-full max-w-[77.5rem] px-4 sm:px-8";

  const renderContent = () => {
    if (selectedMenu === "passe") return <PassMenuContent student={student} />;

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
            availableInterests={availableInterests}
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
            availableInterests={availableInterests}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex min-h-screen w-full flex-col bg-background bg-cover bg-top ${isPersonalInfo ? "lg:bg-size-[max(100%,120rem)_100%] lg:bg-top-left" : "artwork-clean artwork-readable"}`}
      style={{
        backgroundImage: isPersonalInfo
          ? "url(/assets/optimized/profile-2026.403096771b21.webp)"
          : undefined,
      }}
    >
      <div
        className={`flex flex-col items-center pt-20 pb-6 lg:pb-16 ${horizontalPadding}`}
      >
        <div className="relative mb-6 flex items-center justify-center">
          <UserImage
            imageSrc={profile.avatar ?? student.avatar}
            className="size-32 lg:size-52"
            editable={isPersonalInfo}
            onChange={(image) => {
              setImageSrc(image);
              setCroppedAreaPixels(null);
              setIsAvatarModalVisible(true);
            }}
          />
        </div>
        <h1
          className="mb-2 max-w-full text-center wrap-break-word text-white"
          style={{
            fontFamily: '"Coolvetica", sans-serif',
            fontWeight: 400,
            fontSize: "clamp(2rem, 5vw, 2.8125rem)",
            lineHeight: "100%",
            letterSpacing: "0%",
          }}
        >
          {student.name}
        </h1>
        <p
          className="max-w-full text-center break-all text-gray-100"
          style={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 400,
            fontSize: "20px",
            lineHeight: "100%",
            letterSpacing: "0%",
          }}
        >
          {student.user.email}
        </p>
        {student.cvPurgedAt && (
          <div
            className="mb-6 flex items-center gap-3 px-4 py-3 text-sm text-white"
            style={{
              border: "1px solid #ED8326",
              backgroundColor: "rgba(237,131,38,0.1)",
            }}
          >
            <FiAlertTriangle className="size-5 shrink-0 text-ui-highlight" />
            <span>
              O teu CV foi removido após o período de retenção. Envia um novo em
              Definições.
            </span>
          </div>
        )}
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
        className={`flex flex-1 flex-col gap-6 pb-20 lg:flex-row lg:gap-1.5 ${horizontalPadding}`}
      >
        <div className="min-w-0 flex-1 lg:order-2">
          <p className="mb-1 rounded-full border border-primary bg-background px-6 py-3 text-sm lg:hidden">
            {sidebarItems.find((item) => item.key === selectedMenu)?.label}
          </p>
          <div
            ref={contentRef}
            tabIndex={-1}
            role="region"
            aria-label={
              sidebarItems.find((item) => item.key === selectedMenu)?.label ??
              "Perfil"
            }
            className="min-w-0 border border-secondary bg-background p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6 xl:p-11"
          >
            {renderContent()}
          </div>
        </div>
        <div className="w-full shrink-0 lg:order-1 lg:w-64 xl:w-88.5">
          <nav aria-label="Perfil" className="flex flex-col gap-1">
            {sidebarItems.map(renderButton)}
            {secondaryItems.map(renderButton)}
          </nav>
        </div>
      </div>
      <Modal
        isVisible={isAvatarModalVisible}
        setIsVisible={setIsAvatarModalVisible}
        className="flex w-full max-w-lg flex-col gap-6"
        aria-labelledby="avatar-modal-title"
      >
        <h2 id="avatar-modal-title" className="text-3xl">
          Altera o teu avatar
        </h2>
        <AvatarCropper {...{ imageSrc, setImageSrc, setCroppedAreaPixels }} />
        <PrimaryButton
          onClick={confirmAvatar}
          loading={isAvatarLoading}
          disabled={!croppedAreaPixels}
        >
          Confirmar
        </PrimaryButton>
      </Modal>
      {ConfirmDialog}
    </div>
  );
};

type MenuKey =
  "sumario" | "passe" | "desafios" | "info" | "definicoes" | "logout";

interface SidebarItem {
  key: MenuKey;
  label: string;
  icon: IconType;
  tabValue?: TabValue;
}

export default ProfileSectionContainer;

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
import { useUiText } from "@/contexts/UiLanguageContext";
import Modal from "@/components/ui/Modal";
import PrimaryButton from "@/components/ui/PrimaryButton";
import UiText from "@/components/ui/UiText";
import PassMenuContent from "@/components/PassSection/PassMenuContent";
import AvatarCropper from "@/components/Profile/AvatarCropper";
import UserImage from "@/components/Profile/UserImage";
import StaffAttendanceCard from "@/components/StaffAttendanceCard";
import type { StudentActionDto } from "@/application/dto/actionDto";
import type { SavedStudentDto } from "@/application/dto/historyDto";
import type { InterestDto } from "@/application/dto/interestDto";
import type { StudentDto } from "@/application/dto/studentDto";
import { uploadAvatar } from "@/client/api/upload";
import { getCroppedImg } from "@/utils/canvas";

import ActionsSection from "../ActionsSection";
import ProfileSection from "../ProfileSection";
import StatsSection from "../StatsSection";

import { IconType } from "react-icons";

type TabValue = "Sumário" | "Perfil" | "Desafios";

interface ProfileSectionContainerProps {
  student: StudentDto;
  interestIds: string[];
  globalStats: Stats;
  todayStats: number;
  companiesLeft: number;
  historyData: SavedStudentDto[];
  actions: StudentActionDto[];
  availableInterests: InterestDto[];
  /** Admin or nei-member: shows the attendance scanner entry point. */
  canRecordAttendance?: boolean;
}

const menuMap: Record<TabValue, MenuKey> = {
  Sumário: "sumario",
  Perfil: "info",
  Desafios: "desafios",
};

const ProfileSectionContainer: React.FC<ProfileSectionContainerProps> = ({
  student,
  interestIds,
  globalStats,
  companiesLeft,
  historyData,
  actions,
  availableInterests,
  canRecordAttendance = false,
}) => {
  const t = useUiText();

  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousMenu = useRef<MenuKey>("sumario");
  const session = useSession();
  const { handleLogout, ConfirmDialog } = useLogout();

  const [activeTab, setActiveTab] = useState<TabValue>("Sumário");
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>(menuMap[activeTab]);

  useEffect(() => {
    setSelectedMenu(menuMap[activeTab]);
  }, [activeTab]);

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
    // The page scrolls smoothly, so the scroll that brought the menu entry
    // into view can still be running. Left alone, it carries on past the new
    // panel after this check. Stop it where it is first.
    window.scrollTo({ top: window.scrollY, behavior: "instant" });
    const top = section.getBoundingClientRect().top;
    const topBar = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
    if (top < topBar || top > window.innerHeight)
      section.scrollIntoView({ block: "start", behavior: "instant" });
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
        toast.error(t("Não foi possível carregar a imagem."));
        return;
      }
      setProfile((previous) => ({ ...previous, avatar: uploaded.url }));
      setIsAvatarModalVisible(false);
    } catch {
      toast.error(t("Não foi possível carregar a imagem."));
    } finally {
      setIsAvatarLoading(false);
    }
  };

  const sidebarItems: SidebarItem[] = [
    {
      key: "sumario",
      label: t("Sumário"),
      icon: FiFileText,
      tabValue: "Sumário",
    },
    // show Passe only if current session user is the profile student
    ...(session.user?.student?.code
      ? ([
          { key: "passe", label: t("Passe do FallStack"), icon: FiGrid },
        ] as SidebarItem[])
      : []),
    {
      key: "desafios",
      label: t("Desafios"),
      icon: FiMapPin,
      tabValue: "Desafios",
    },
    {
      key: "info",
      label: t("Informações pessoais"),
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
        className={`${isCurrent ? "hidden lg:flex" : "flex"} ${item.key === "logout" ? "mt-1" : ""} min-h-12 w-full items-center justify-between gap-2 rounded-full border bg-background px-6 py-2 text-left text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isCurrent ? "border-primary" : "border-secondary hover:border-white/60"}`}
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

  // Let a long email wrap before the "@" rather than at any character.
  const atIndex = student.user.email.lastIndexOf("@");
  const emailLocalPart =
    atIndex > 0 ? student.user.email.slice(0, atIndex) : student.user.email;
  const emailDomain = atIndex > 0 ? student.user.email.slice(atIndex + 1) : "";

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
            <h2 className="mb-5 text-center font-sans text-2xl font-semibold text-white lg:text-left lg:text-[1.75rem]">
              {t("Desafios")}
            </h2>
            <ActionsSection actions={actions} />
          </>
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
          ? // Same 60% overlay as .artwork-readable, so header text stays >= 4.5:1.
            "linear-gradient(#14141499, #14141499), url(/assets/optimized/profile-2026.403096771b21.webp)"
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
        <h1 className="mb-2 max-w-full text-center font-title text-[clamp(2rem,5vw,2.8125rem)] leading-none font-normal tracking-normal wrap-break-word text-white">
          {student.name}
        </h1>
        <p className="max-w-full text-center font-sans text-xl leading-none font-normal tracking-normal wrap-break-word text-gray-100">
          {emailLocalPart}
          {emailDomain && (
            <>
              <wbr />@{emailDomain}
            </>
          )}
        </p>
        {student.cvPurgedAt && (
          <div className="mt-4 mb-6 flex items-center gap-3 border border-ui-highlight bg-ui-highlight/10 px-4 py-3 text-sm text-white">
            <FiAlertTriangle className="size-5 shrink-0 text-ui-highlight" />
            <span>
              {t(
                "O teu CV foi removido após o período de retenção. Envia um novo em Informações pessoais."
              )}
            </span>
          </div>
        )}
        {canRecordAttendance && (
          <div className="mt-6 flex w-full justify-center">
            <StaffAttendanceCard />
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
        <div
          ref={sectionRef}
          className="min-w-0 flex-1 field-focus-target lg:order-2"
        >
          <p className="mb-1 rounded-full border border-primary bg-background px-6 py-3 text-sm lg:hidden">
            {sidebarItems.find((item) => item.key === selectedMenu)?.label}
          </p>
          <div
            ref={contentRef}
            tabIndex={-1}
            role="region"
            aria-label={
              sidebarItems.find((item) => item.key === selectedMenu)?.label ??
              t("Perfil")
            }
            className="min-w-0 border border-secondary bg-background p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6 xl:p-11"
          >
            {renderContent()}
          </div>
        </div>
        <div className="w-full shrink-0 lg:order-1 lg:w-64 xl:w-88.5">
          <nav aria-label={t("Perfil")} className="flex flex-col gap-1">
            {sidebarItems.map(renderButton)}
            {secondaryItems.map(renderButton)}
          </nav>
        </div>
      </div>
      <Modal
        isVisible={isAvatarModalVisible}
        setIsVisible={setIsAvatarModalVisible}
        className="flex w-full max-w-lg flex-col gap-6 border border-ui-border bg-ui-surface! text-white!"
        aria-labelledby="avatar-modal-title"
      >
        <h2
          id="avatar-modal-title"
          className="font-sans text-2xl text-white lg:text-[1.75rem]"
        >
          {" "}
          <UiText text="Altera o teu avatar" />{" "}
        </h2>
        <AvatarCropper {...{ imageSrc, setImageSrc, setCroppedAreaPixels }} />
        <PrimaryButton
          onClick={confirmAvatar}
          loading={isAvatarLoading}
          disabled={!croppedAreaPixels}
        >
          {" "}
          <UiText text="Confirmar" />{" "}
        </PrimaryButton>
      </Modal>
      {ConfirmDialog}
    </div>
  );
};

type MenuKey = "sumario" | "passe" | "desafios" | "info" | "logout";

interface SidebarItem {
  key: MenuKey;
  label: string;
  icon: IconType;
  tabValue?: TabValue;
}

export default ProfileSectionContainer;

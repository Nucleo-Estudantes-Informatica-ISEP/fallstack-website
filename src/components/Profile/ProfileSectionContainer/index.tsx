"use client";

import { useEffect, useState } from "react";
import type { Area } from "react-easy-crop";
import {
  FiAlertTriangle,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMapPin,
  FiUser,
} from "react-icons/fi";
import { MdOutlineQrCodeScanner } from "react-icons/md";
import { toast } from "react-toastify";

import { ProfileData } from "@/types/ProfileData";
import type { Stats } from "@/types/Stats";
import { useLogout } from "@/hooks/useLogout";
import useSession from "@/hooks/useSession";
import Modal from "@/components/ui/Modal";
import PrimaryButton from "@/components/ui/PrimaryButton";
import DashboardShell, {
  DashboardHeader,
  type DashboardNavItem,
} from "@/components/DashboardShell";
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
  /** Admin or nei-member: shows the attendance scanner entry point. */
  canRecordAttendance?: boolean;
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
  canRecordAttendance = false,
}) => {
  const session = useSession();
  const { handleLogout, ConfirmDialog } = useLogout();

  const [activeTab, setActiveTab] = useState<TabValue>("Sumário");
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>(menuMap[activeTab]);

  useEffect(() => {
    setSelectedMenu(menuMap[activeTab]);
  }, [activeTab]);

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
    ...(canRecordAttendance
      ? ([
          {
            key: "presencas",
            label: "Scan de Palestras",
            icon: MdOutlineQrCodeScanner,
            href: "/attendance/scan",
          },
        ] as SidebarItem[])
      : []),
  ];

  const secondaryItems: SidebarItem[] = [
    { key: "logout", label: "Logout", icon: FiLogOut },
  ];

  const handleMenuClick = (item: SidebarItem) => {
    if (item.key === "logout") {
      handleLogout();
      return;
    }
    setSelectedMenu(item.key);
    if (item.tabValue) {
      setActiveTab(item.tabValue);
    }
  };

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
            <h2 className="mb-4 text-2xl font-semibold text-white">Desafios</h2>
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
    <>
      <DashboardShell
        className={
          isPersonalInfo
            ? "bg-cover bg-top lg:bg-size-[max(100%,120rem)_100%] lg:bg-top-left"
            : "artwork-clean artwork-readable bg-cover bg-top"
        }
        style={
          isPersonalInfo
            ? {
                backgroundImage:
                  "url(/assets/optimized/profile-2026.403096771b21.webp)",
              }
            : undefined
        }
        header={
          <DashboardHeader
            avatar={
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
            }
            title={student.name}
            subtitle={student.user.email}
          >
            {student.cvPurgedAt && (
              <div className="mt-6 flex items-center gap-3 border border-ui-highlight bg-ui-highlight/10 px-4 py-3 text-sm text-white">
                <FiAlertTriangle className="size-5 shrink-0 text-ui-highlight" />
                <span>
                  O teu CV foi removido após o período de retenção. Envia um
                  novo em Definições.
                </span>
              </div>
            )}
          </DashboardHeader>
        }
        navLabel="Perfil"
        items={sidebarItems}
        secondaryItems={secondaryItems}
        selectedKey={selectedMenu}
        onSelect={(item) => handleMenuClick(item as SidebarItem)}
      >
        {renderContent()}
      </DashboardShell>
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
    </>
  );
};

type MenuKey =
  | "sumario"
  | "passe"
  | "desafios"
  | "info"
  | "definicoes"
  | "presencas"
  | "logout";

interface SidebarItem extends DashboardNavItem {
  key: MenuKey;
  tabValue?: TabValue;
}

export default ProfileSectionContainer;

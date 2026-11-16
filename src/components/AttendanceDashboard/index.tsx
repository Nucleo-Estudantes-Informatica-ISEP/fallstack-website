"use client";

import Image from "next/image";
import { FiFileText, FiLogOut } from "react-icons/fi";
import { MdOutlineQrCodeScanner } from "react-icons/md";

import { useLogout } from "@/hooks/useLogout";
import AttendanceScanner, {
  type AttendanceSessionDto,
} from "@/components/AttendanceScanner";
import DashboardShell, {
  DashboardHeader,
  type DashboardNavItem,
} from "@/components/DashboardShell";

interface AttendanceDashboardProps {
  sessions: AttendanceSessionDto[];
  staffName: string;
  staffEmail: string;
  initialSessionId: string | null;
  /** The staff member's own profile, when they have one. */
  profileHref: string | null;
}

/** The attendance scanner inside the same frame as the student dashboard. */
const AttendanceDashboard: React.FC<AttendanceDashboardProps> = ({
  sessions,
  staffName,
  staffEmail,
  initialSessionId,
  profileHref,
}) => {
  const { handleLogout, ConfirmDialog } = useLogout();

  const items: DashboardNavItem[] = [
    ...(profileHref
      ? [
          {
            key: "sumario",
            label: "Sumário",
            icon: FiFileText,
            href: profileHref,
          },
        ]
      : []),
    {
      key: "presencas",
      label: "Scan de Palestras",
      icon: MdOutlineQrCodeScanner,
      href: "/attendance/scan",
    },
  ];

  return (
    <>
      <DashboardShell
        header={
          <DashboardHeader
            avatar={
              <Image
                src="/assets/images/default_user.png"
                alt=""
                width={208}
                height={208}
                className="mb-6 size-32 rounded-full lg:size-52"
              />
            }
            title={staffName}
            subtitle={staffEmail}
          />
        }
        navLabel="Presenças"
        items={items}
        secondaryItems={[{ key: "logout", label: "Logout", icon: FiLogOut }]}
        selectedKey="presencas"
        onSelect={handleLogout}
      >
        <AttendanceScanner
          sessions={sessions}
          initialSessionId={initialSessionId}
        />
      </DashboardShell>
      {ConfirmDialog}
    </>
  );
};

export default AttendanceDashboard;

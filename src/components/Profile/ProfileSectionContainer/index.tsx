"use client";

import { useState } from "react";
import { Action, Student, User } from "@prisma/client";
import { motion } from "framer-motion";

import { ProfileData } from "@/types/ProfileData";
import { SavedStudentWithSavedBy } from "@/types/SavedStudentWithSavedBy";
import UserImage from "@/components/Profile/UserImage";
import { Github, Linkedin } from "@/styles/Icons";

import ActionsSection from "../ActionsSection";
import ProfileSection from "../ProfileSection";
import SettingsSection from "../SettingsSection";
import StatsSection from "../StatsSection";

interface ProfileSectionContainerProps {
  student: Student & { user: User };
  interests: string[];
  globalStats: number[];
  todayStats: number;
  companiesLeft: number;
  historyData: SavedStudentWithSavedBy[];
  actions: (Action & { done: boolean })[];
}

const ProfileSectionContainer: React.FC<ProfileSectionContainerProps> = ({
  student,
  interests,
  globalStats,
  todayStats,
  companiesLeft,
  historyData,
  actions,
}) => {
  const tabs = ["Sumário", "Perfil", "Desafios", "Definições"] as const;
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Sumário");

  const [profile, setProfile] = useState<ProfileData>({
    interests,
    bio: student.bio,
    linkedin: student.linkedin,
    github: student.github,
    cv: student.cv,
    avatar: null,
  });

  return (
    <div className="size-full items-center justify-center md:mb-12">
      <div
        className={`flex w-full flex-col items-center ${
          activeTab === "Definições" ? "pt-12" : "pt-4"
        } mb-12 h-full bg-company-secondary`}
      >
        <motion.div
          animate={{
            height: activeTab !== "Definições" ? "auto" : 0,
            visibility: activeTab !== "Definições" ? "visible" : "hidden",
            marginTop: activeTab !== "Definições" ? "3rem" : 0,
            opacity: activeTab !== "Definições" ? 1 : 0,
          }}
          transition={{ duration: 0.5 }}
          className="mt-4 flex flex-col items-center justify-center"
        >
          <UserImage imageSrc={student.avatar} />

          <p className="px-4 text-center text-xl font-semibold">
            <span className="font-bold">{student.name}</span>
          </p>
          <p className="p-2 text-center">
            O teu perfil já foi gravado{" "}
            <span className="font-bold text-primary">{todayStats} vezes</span>{" "}
            hoje.
          </p>
          <p className="flex gap-x-4 pt-6">
            {profile.github && (
              <a
                href={profile.github}
                target="_blank"
                rel="noopener noreferrer"
              >
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
        </motion.div>

        <div className="relative mb-4 mt-8 flex w-full max-w-3xl flex-col items-center justify-between gap-y-4 text-center text-lg md:mb-0 md:flex-row lg:w-5/6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative w-44 rounded-md px-4 py-2 md:hover:bg-slate-200/30 ${
                activeTab === tab ? "font-bold text-primary" : "font-normal"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.span
                  layoutId="tabIndicator"
                  className="absolute -bottom-1 left-0 hidden h-1 w-full rounded-full bg-primary md:block"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl md:w-5/6">
        {activeTab === "Sumário" && (
          <StatsSection
            stats={globalStats}
            companiesLeft={companiesLeft}
            historyData={historyData}
          />
        )}
        {activeTab === "Perfil" && (
          <ProfileSection
            student={student}
            interests={interests}
            profile={profile}
          />
        )}
        {activeTab === "Desafios" && <ActionsSection actions={actions} />}
        {activeTab === "Definições" && (
          <SettingsSection
            student={student}
            profile={profile}
            setProfile={setProfile}
            setActiveTab={setActiveTab}
          />
        )}
      </div>
    </div>
  );
};

export default ProfileSectionContainer;

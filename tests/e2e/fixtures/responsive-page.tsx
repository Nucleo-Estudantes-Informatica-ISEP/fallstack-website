"use client";

import { useEffect, useState } from "react";

import { AuthContextProvider } from "@/contexts/AuthContext";
import AuthPageLayout from "@/components/AuthPageLayout";
import HomePage from "@/components/HomePage";
import ProfileSectionContainer from "@/components/Profile/ProfileSectionContainer";
import Schedule from "@/components/Schedule";
import StudentSignUp from "@/components/StudentSignUp";

const student = {
  id: "test",
  code: "12345",
  name: "Alexandra Maria Correia de Albuquerque",
  user: { email: "1234567@isep.ipp.pt" },
  bio: null,
  year: "1º Ano Licenciatura",
  course: null,
  cv: null,
  cvPurgedAt: null,
  linkedin: null,
  github: null,
  avatar: null,
};
export default function Fixture() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [view, setView] = useState("home");
  const schedule = (
    <Schedule
      firstDayTitle="17 de Novembro"
      secondDayTitle="18 de Novembro"
      scheduleEvents={[
        [
          {
            hour: "10.00h",
            activity:
              "A very long programme title with words and SuperLongUnbrokenTitleToCheckWrappingAtSmallViewportWidths",
          },
        ],
        [{ hour: "11.00h", activity: "Second day session" }],
      ]}
    />
  );
  return (
    <AuthContextProvider
      initialUser={{
        role: "STUDENT",
        adminRole: null,
        student: { name: student.name, code: student.code },
      }}
    >
      <nav aria-label="Fixture">
        <button disabled={!ready} onClick={() => setView("home")}>
          Home fixture
        </button>
        <button disabled={!ready} onClick={() => setView("signup")}>
          Signup fixture
        </button>
        <button disabled={!ready} onClick={() => setView("profile")}>
          Profile fixture
        </button>
      </nav>
      {view === "home" ? (
        <HomePage
          sections={{ schedule, companies: null, sponsors: null, faqs: null }}
        />
      ) : view === "signup" ? (
        <AuthPageLayout>
          <StudentSignUp
            interests={[]}
            institutionalEmail="1234567@isep.ipp.pt"
          />
        </AuthPageLayout>
      ) : (
        <ProfileSectionContainer
          student={student}
          interestIds={[]}
          globalStats={{ totalScans: 0, totalSaves: 0 }}
          todayStats={0}
          companiesLeft={0}
          historyData={[]}
          actions={[]}
          availableInterests={[]}
        />
      )}
    </AuthContextProvider>
  );
}

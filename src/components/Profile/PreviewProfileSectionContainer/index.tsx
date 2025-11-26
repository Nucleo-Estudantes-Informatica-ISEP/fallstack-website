"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Student, User } from "@prisma/client";
import swal from "sweetalert";

import { BASE_URL } from "@/services/api";
import UserImage from "@/components/Profile/UserImage";
import { Email, Github, Linkedin, OpenCv } from "@/styles/Icons";
import { useRouter } from "next/navigation";

interface PreviewProfileSectionContainerProps {
  student: Student & { user: User };
  interests: string[];
  token?: string;
  isCompanyView?: boolean;
  isSavedStudent?: boolean;
}

const PreviewProfileSectionContainer: React.FC<
  PreviewProfileSectionContainerProps
> = ({ student, interests, token, isCompanyView, isSavedStudent }) => {
  const horizontalPadding = "clamp(20px, 11.11vw, 168px)";

  const orderedInterests = useMemo(
    () => [...interests].sort((a, b) => a.localeCompare(b)),
    [interests]
  );
  const router = useRouter();
  const handleSaveProfile = async () => {
    if (!token) return;

    const res = await fetch(BASE_URL + "/saved", {
      method: "PATCH",
      body: JSON.stringify({ token }),
    });

    if (res.status === 200) {
      swal({
        title: "Success",
        text: "Perfil salvo com sucesso!",
        icon: "success",
      }).then(() => {
        window.location.reload();
      });
    } else if (res.status === 400) {
      swal({
        title: "Warning",
        text: "Perfil já salvo!",
        icon: "warning",
      });
    } else {
      swal({
        title: "Error",
        text: "Erro ao salvar perfil!",
        icon: "error",
      });
    }
  };

  const handleOpenCv = async () => {
    const res = await fetch(BASE_URL + `/students/${student.code}/cv`);
    const { url } = await res.json();
    window.open(url, "_blank");
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
        className="flex flex-col items-center pt-12 pb-10"
        style={{
          paddingLeft: horizontalPadding,
          paddingRight: horizontalPadding,
        }}
      >
        <div className="relative mb-6 flex items-center justify-center">
          <UserImage imageSrc={student.avatar} className="size-40 md:size-52" />
        </div>
        <h1
          className="mb-2 text-center text-white"
          style={{
            fontFamily: '"Coolvetica", sans-serif',
            fontWeight: 400,
            fontSize: "42px",
            lineHeight: "100%",
            letterSpacing: "0%",
          }}
        >
          {student.name}
        </h1>
        <p
          className="text-center text-gray-200"
          style={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 400,
            fontSize: "18px",
            lineHeight: "100%",
            letterSpacing: "0%",
            marginBottom: "clamp(10px, 4vw, 36px)",
          }}
        >
          {student.user.email}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {student.github && (
            <a
              href={student.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:border-primary rounded-full border border-[#2d2d2d] bg-black/40 px-4 py-2 text-white transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-center gap-2">
                <Github className="size-5" />
                <span>GitHub</span>
              </div>
            </a>
          )}
          {student.linkedin && (
            <a
              href={student.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:border-primary rounded-full border border-[#2d2d2d] bg-black/40 px-4 py-2 text-white transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-center gap-2">
                <Linkedin className="size-5" />
                <span>LinkedIn</span>
              </div>
            </a>
          )}
          {isCompanyView && !isSavedStudent && (
            <button
              onClick={handleSaveProfile}
              className="border-primary/60 bg-primary rounded-full border px-4 py-2 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              + Salvar perfil
            </button>
          )}
        </div>
      </div>

      <div
        className="flex flex-1 flex-col gap-6 pb-16"
        style={{
          paddingLeft: horizontalPadding,
          paddingRight: horizontalPadding,
        }}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <section className="rounded-2xl border border-[#303030] bg-[rgba(15,15,15,0.85)] p-6 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.08em] text-gray-400 uppercase">
                    Informações pessoais
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-white">
                    {student.name}
                  </h2>
                  <p className="text-sm text-gray-300">{student.year}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-[#2a2a2a] bg-black/60 px-4 py-3 text-sm text-gray-200">
                  <Email className="text-primary size-5" />
                  <div className="flex flex-col">
                    <span className="text-xs tracking-[0.08em] text-gray-500 uppercase">
                      Email
                    </span>
                    <span className="font-medium">{student.user.email}</span>
                  </div>
                </div>
                {student.cv && (
                  <button
                    onClick={handleOpenCv}
                    className="border-primary/60 bg-primary/10 hover:bg-primary/20 flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold text-white transition hover:-translate-y-0.5"
                  >
                    <OpenCv className="text-primary size-5" />
                    <div className="flex flex-col">
                      <span className="text-xs tracking-[0.08em] text-gray-300 uppercase">
                        Curriculum
                      </span>
                      <span>Abrir o CV de {student.name}</span>
                    </div>
                  </button>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-[#303030] bg-[rgba(15,15,15,0.85)] p-6 shadow-2xl backdrop-blur">
            <p className="text-xs font-semibold tracking-[0.08em] text-gray-400 uppercase">
              Interesses
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {orderedInterests.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Ainda não definiste os teus interesses...
                </p>
              ) : (
                orderedInterests.map((interest) => (
                  <span
                    key={interest}
                    className="border-primary/50 bg-primary/15 rounded-full border px-3 py-1 text-sm font-medium text-white"
                  >
                    {interest}
                  </span>
                ))
              )}
            </div>
          </section>
        </div>

        {student.bio && (
          <section className="rounded-2xl border border-[#303030] bg-[rgba(15,15,15,0.85)] p-6 shadow-2xl backdrop-blur">
            <p className="text-xs font-semibold tracking-[0.08em] text-gray-400 uppercase">
              Sobre
            </p>
            <p className="mt-3 text-base leading-relaxed whitespace-pre-wrap text-gray-100">
              {student.bio}
            </p>
          </section>
        )}
        <button
            onClick={() => router.push("/dashboard")}
            className="border border-[#2a2a2a] bg-black/50 px-4 py-2 rounded-full text-white hover:bg-black/60 transition"
        >
          Voltar
        </button>
      </div>
    </div>
  );
};

export default PreviewProfileSectionContainer;

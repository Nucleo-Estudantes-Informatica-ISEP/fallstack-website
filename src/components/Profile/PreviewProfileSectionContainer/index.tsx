"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { toast } from "react-toastify";

import { httpClient, HttpClientError } from "@/lib/http/client";
import { useMutation } from "@/hooks/useMutation";
import { Email, Github, Linkedin, OpenCv } from "@/components/ui/Icons";
import UserImage from "@/components/Profile/UserImage";
import type { StudentDto } from "@/application/dto/studentDto";

interface PreviewProfileSectionContainerProps {
  student: StudentDto;
  interests: string[];
  token?: string;
  isCompanyView?: boolean;
  isSavedStudent?: boolean;
}

// Student profile as a company sees it after a scan (S3/S4). Same header and
// dark panels as the dashboards; the saved-student (S1) and public (S6) views
// repeat this look in their own files.
const container = "mx-auto w-full max-w-[77.5rem] px-4 sm:px-8";
const panel = "border border-secondary bg-background p-6";
const panelTitle =
  "font-sans text-xs font-semibold tracking-[0.08em] text-gray-300 uppercase";
const linkPill =
  "inline-flex min-h-11 items-center gap-2 rounded-full border border-secondary bg-black/40 px-4 py-2 text-white transition-colors hover:border-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const PreviewProfileSectionContainer: React.FC<
  PreviewProfileSectionContainerProps
> = ({ student, interests, token, isCompanyView, isSavedStudent }) => {
  const orderedInterests = useMemo(
    () => [...interests].sort((a, b) => a.localeCompare(b)),
    [interests]
  );
  const { mutate, isPending } = useMutation();
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const yearAndCourse = [student.year, student.course]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    return () => {
      if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
    };
  }, []);

  const handleSaveProfile = () =>
    mutate(async () => {
      if (!token) return;

      try {
        await httpClient.patch("/saved", { token });
      } catch (error) {
        // Already saved: 409 from the duplicate check, or 400 when a
        // concurrent save wins the race (saveStudent in savedStudentService).
        if (
          error instanceof HttpClientError &&
          (error.status === 409 || error.status === 400)
        ) {
          toast.warning("Perfil já salvo!", { toastId: "preview-saved" });
          return;
        }
        toast.error("Não foi possível guardar o perfil. Tenta novamente.", {
          toastId: "preview-save-failed",
        });
        return;
      }
      toast.success("Perfil salvo com sucesso!");
      reloadTimeoutRef.current = setTimeout(
        () => window.location.reload(),
        1500
      );
    });

  const handleOpenCv = async () => {
    try {
      const { url } = await httpClient.get<{ url: string }>(
        `/students/${student.code}/cv`
      );
      window.open(url, "_blank");
    } catch {
      toast.error("Não foi possível abrir o CV. Tenta novamente.", {
        toastId: "preview-cv-failed",
      });
    }
  };

  return (
    <div className="artwork-clean artwork-readable flex min-h-screen w-full flex-col">
      <div
        className={`flex flex-col items-center pt-20 pb-10 lg:pb-16 ${container}`}
      >
        <div className="relative mb-6 flex items-center justify-center">
          <UserImage imageSrc={student.avatar} className="size-32 lg:size-52" />
        </div>
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
          {student.name}
        </h1>
        <p
          className="mb-6 max-w-full text-center wrap-anywhere text-gray-100"
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
        <div className="flex flex-wrap items-center justify-center gap-4">
          {student.github && (
            <a
              href={student.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`GitHub de ${student.name} (abre num novo separador)`}
              className={linkPill}
            >
              <Github className="size-5" aria-hidden />
              <span>GitHub</span>
            </a>
          )}
          {student.linkedin && (
            <a
              href={student.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`LinkedIn de ${student.name} (abre num novo separador)`}
              className={linkPill}
            >
              <Linkedin className="size-5" aria-hidden />
              <span>LinkedIn</span>
            </a>
          )}
          {isCompanyView && !isSavedStudent && (
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={isPending}
              aria-busy={isPending}
              className="ui-action rounded-full"
            >
              {isPending ? "A guardar..." : "+ Salvar perfil"}
            </button>
          )}
        </div>
      </div>

      <div className={`flex flex-1 flex-col gap-6 pb-20 ${container}`}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section
            aria-labelledby="preview-info"
            className={`${panel} min-w-0 lg:col-span-2`}
          >
            <h2 id="preview-info" className={panelTitle}>
              Informações pessoais
            </h2>
            <p className="mt-2 text-2xl font-bold wrap-break-word text-white">
              {student.name}
            </p>
            {yearAndCourse && (
              <p className="text-sm wrap-break-word text-gray-300">
                {yearAndCourse}
              </p>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex min-w-0 items-center gap-3 border border-secondary bg-black/60 px-4 py-3 text-sm text-gray-200">
                <Email className="size-5 shrink-0 text-primary" aria-hidden />
                <div className="flex min-w-0 flex-col">
                  <span className="text-xs tracking-[0.08em] text-gray-300 uppercase">
                    Email
                  </span>
                  <a
                    href={`mailto:${student.user.email}`}
                    className="font-medium wrap-anywhere hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {student.user.email}
                  </a>
                </div>
              </div>
              {student.cv && (
                <button
                  type="button"
                  onClick={handleOpenCv}
                  className="flex min-w-0 items-center gap-3 border border-primary/60 bg-primary/10 px-4 py-3 text-left text-sm font-semibold text-white transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <OpenCv
                    className="size-5 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-xs tracking-[0.08em] text-gray-300 uppercase">
                      Curriculum
                    </span>
                    <span className="wrap-break-word">
                      Abrir o CV de {student.name}
                    </span>
                  </span>
                </button>
              )}
            </div>
          </section>

          <section
            aria-labelledby="preview-interests"
            className={`${panel} min-w-0`}
          >
            <h2 id="preview-interests" className={panelTitle}>
              Interesses
            </h2>
            {orderedInterests.length === 0 ? (
              <p className="mt-4 text-sm text-gray-300">
                Este estudante ainda não indicou interesses.
              </p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-3">
                {orderedInterests.map((interest) => (
                  <li
                    key={interest}
                    className="max-w-full rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-sm font-medium wrap-break-word text-white"
                  >
                    {interest}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {student.bio && (
          <section aria-labelledby="preview-bio" className={panel}>
            <h2 id="preview-bio" className={panelTitle}>
              Sobre
            </h2>
            <p className="mt-3 text-base leading-relaxed wrap-break-word whitespace-pre-wrap text-gray-100">
              {student.bio}
            </p>
          </section>
        )}

        {isCompanyView && (
          <Link
            href="/dashboard"
            className="self-start rounded-full border border-secondary bg-black/50 px-6 py-2 text-white transition-colors hover:border-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Voltar ao painel
          </Link>
        )}
      </div>
    </div>
  );
};

export default PreviewProfileSectionContainer;

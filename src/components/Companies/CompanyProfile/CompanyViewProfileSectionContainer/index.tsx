"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

import { httpClient, HttpClientError } from "@/lib/http/client";
import { useMutation } from "@/hooks/useMutation";
import BioSection from "@/components/Profile/BioSection";
import ContactSection from "@/components/Profile/ContactSection";
import InterestsSection from "@/components/Profile/InterestsSection";
import OpenCvSection from "@/components/Profile/OpenCvSection";
import UserImage from "@/components/Profile/UserImage";
import type { StudentDto } from "@/application/dto/studentDto";
import { Github, Linkedin } from "@/styles/Icons";

interface CompanyViewProfileSectionContainerProps {
  student: StudentDto;
  interests: string[];
  token: string;
  isSavedStudent: boolean;
}

const CompanyViewProfileSectionContainer: React.FC<
  CompanyViewProfileSectionContainerProps
> = ({ student, interests, token, isSavedStudent }) => {
  const [comment, setComment] = useState("");
  const { mutate, isPending } = useMutation("Erro ao salvar perfil!");
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
    };
  }, []);

  const handleSaveProfile = () =>
    mutate(async () => {
      try {
        await httpClient.patch("/saved", { token, comment });
        toast.success("Perfil salvo com sucesso!");
        reloadTimeoutRef.current = setTimeout(
          () => window.location.reload(),
          1500
        );
      } catch (error) {
        if (error instanceof HttpClientError && error.status === 400) {
          toast.warning("Perfil já salvo!");
          return;
        }
        throw error;
      }
    });

  return (
    <div
      className={`bg-company mt-12 size-full items-center justify-center md:my-14`}
    >
      <div className="bg-company mt-4 mb-12 flex size-full flex-col items-center">
        <motion.div
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center pt-8"
        >
          <UserImage imageSrc={student.avatar} />

          <div className="flex flex-col gap-y-2 px-4 text-center">
            <p className="text-3xl font-bold md:text-4xl">
              <span>{student.name}</span>
            </p>
            <p className="text-lg md:text-xl">
              <span>{student.year}</span>
            </p>
          </div>
          <div className="flex gap-x-4 pt-6">
            {student.github && (
              <a
                href={student.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="size-10 md:size-8" />
              </a>
            )}
            {student.linkedin && (
              <a
                href={student.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="size-10 md:size-8" />
              </a>
            )}
            {!isSavedStudent && (
              <div className="flex flex-col items-center gap-2">
                <textarea
                  className="rounded-md border border-gray-300 p-2 text-black"
                  placeholder="Adicionar comentário (opcional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  style={{ minWidth: 220, maxWidth: 320 }}
                />
                <button
                  onClick={handleSaveProfile}
                  disabled={isPending}
                  className="rounded-lg bg-primary px-3 font-bold hover:scale-105 hover:bg-primary/100 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "A guardar..." : "+ Salvar Perfil"}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
      <section className="mx-auto flex size-full max-w-4xl flex-col rounded-md bg-white py-4 md:w-5/6">
        {student.bio && <BioSection bio={student.bio} />}
        <ContactSection email={student.user.email} />
        {student.cv && (
          <OpenCvSection
            student={student}
            text={"Abrir o CV de " + student.name}
          />
        )}
        {interests.length > 0 && <InterestsSection userInterests={interests} />}
      </section>
    </div>
  );
};
export default CompanyViewProfileSectionContainer;

"use client";

import { Company, Student, User } from "@prisma/client";
import { motion } from "framer-motion";
import swal from "sweetalert";

import { BASE_URL } from "@/services/api";
import BioSection from "@/components/Profile/BioSection";
import ContactSection from "@/components/Profile/ContactSection";
import InterestsSection from "@/components/Profile/InterestsSection";
import OpenCvSection from "@/components/Profile/OpenCvSection";
import UserImage from "@/components/Profile/UserImage";
import { Github, Linkedin } from "@/styles/Icons";

interface CompanyViewProfileSectionContainerProps {
  student: Student & { user: User };
  interests: string[];
  company: Company;
  token: string;
  isSavedStudent: boolean;
}

const CompanyViewProfileSectionContainer: React.FC<
  CompanyViewProfileSectionContainerProps
> = ({ student, interests, company, token, isSavedStudent }) => {
  const handleSaveProfile = async () => {
    if (!company) return swal("Erro ao carregar perfil!");

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

  return (
    <div
      className={`mt-12 size-full items-center justify-center bg-company md:my-14`}
    >
      <div className="mb-12 mt-4 flex size-full flex-col items-center bg-company">
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
              <button
                onClick={handleSaveProfile}
                className="hover:bg-primary/100 rounded-lg bg-primary px-3 font-bold hover:scale-105 hover:shadow-xl"
              >
                + Salvar Perfil
              </button>
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

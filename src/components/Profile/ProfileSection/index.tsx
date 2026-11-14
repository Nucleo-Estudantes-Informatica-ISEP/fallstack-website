"use client";

import { Dispatch, SetStateAction, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { ProfileData } from "@/types/ProfileData";
import { httpClient } from "@/lib/http/client";
import { useMutation } from "@/hooks/useMutation";
import Input from "@/components/ui/Input";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ImportCvSection from "@/components/Profile/ImportCvSection";
import InterestSelector from "@/components/Profile/InterestSelector";
import UserBioTextArea from "@/components/Profile/UserBioTextArea";
import type { InterestDto } from "@/application/dto/interestDto";
import type { StudentDto } from "@/application/dto/studentDto";
import { uploadCv } from "@/client/api/upload";
import {
  isValidLinkedinUrl,
  LINKEDIN_FORMAT_ERROR,
} from "@/schemas/linkedinSchema";

interface ProfileSectionProps {
  student: StudentDto;
  profile: ProfileData;
  setProfile: Dispatch<SetStateAction<ProfileData>>;
  setActiveTab: Dispatch<
    SetStateAction<"Sumário" | "Perfil" | "Desafios" | "Definições">
  >;
  availableInterests: InterestDto[];
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  student,
  profile,
  setProfile,
  setActiveTab,
  availableInterests,
}) => {
  const LIMIT = 255;
  const router = useRouter();

  const githubRef = useRef<HTMLInputElement>(null);
  const linkedinRef = useRef<HTMLInputElement>(null);
  const cvRef = useRef<HTMLInputElement>(null);

  const { mutate: mutateSave, isPending: isLoading } = useMutation(
    "Erro ao atualizar perfil."
  );
  function handleUserBioChange(bio: string) {
    if (bio.length > LIMIT) return;
    setProfile({ ...profile, bio });
  }

  function setUserInterests(interests: string[]) {
    setProfile({ ...profile, interests });
  }

  const handleSave = () => {
    if (profile.bio && profile.bio?.length > LIMIT) {
      toast.error(`A tua bio não pode ter mais de ${LIMIT} caracteres!`);
      return;
    }

    // Validação LinkedIn
    if (
      linkedinRef.current?.value &&
      !isValidLinkedinUrl(linkedinRef.current.value)
    ) {
      toast.error(LINKEDIN_FORMAT_ERROR);
      return;
    }

    // Validação Github
    if (
      githubRef.current?.value &&
      !githubRef.current?.value?.match(
        /^(https:\/\/github\.com\/)([A-zÀ-ú0-9ç_-]+\/?)+$/
      )
    ) {
      toast.error("O teu Github não segue o formato correto!");
      return;
    }

    setProfile({
      ...profile,
      linkedin: linkedinRef.current?.value || null,
      github: githubRef.current?.value || null,
    });

    mutateSave(async () => {
      if (cvRef.current?.files?.length) {
        const cvFile = cvRef.current.files[0]!;
        const uploaded = await uploadCv(cvFile);
        if (uploaded) {
          try {
            await httpClient.post(`/students/${student.code}/cv`, {
              id: uploaded.id,
            });
          } catch (error) {
            console.error("CV save failed:", error);
          }
        }
      }

      await httpClient.patch(`/students/${student.code}`, {
        bio: profile.bio ? profile.bio : undefined,
        github: githubRef.current?.value,
        linkedin: linkedinRef.current?.value,
        interests: profile.interests,
      });

      if (profile.avatar) {
        try {
          await httpClient.post(`/students/${student.code}/avatar`, {
            url: profile.avatar,
          });
        } catch (error) {
          console.error("Avatar save failed:", error);
        }
      }

      toast.success("Perfil atualizado com sucesso!");
      setActiveTab("Perfil");
      router.refresh();
    });
  };

  return (
    <section className="student-profile-form w-full">
      <h2 className="mb-5 text-2xl text-white lg:text-[1.75rem]">
        Informações pessoais
      </h2>
      <div className="flex flex-col gap-y-4">
        {/* NOME */}
        <Input
          name="name"
          id="profile-name"
          label="Nome"
          value={student.name}
          readOnly
          hint="Nome definido no registo."
        />

        {/* CURSO */}
        <Input
          name="course"
          id="profile-course"
          label="Curso"
          value={student.course ?? "Não indicado"}
          readOnly
          hint="Definido no registo."
        />

        {/* ANO */}
        <Input
          name="year"
          id="profile-year"
          label="Ano"
          value={student.year}
          readOnly
          hint="Definido no registo."
        />

        {/* EMAIL */}
        <Input
          name="email"
          id="profile-email"
          label="Email"
          value={student.user.email}
          readOnly
          hint="Associado à tua conta institucional."
        />

        {/* LINKEDIN */}
        <Input
          name="linkedin"
          id="profile-linkedin"
          label="LinkedIn"
          defaultValue={profile.linkedin}
          placeholder="https://www.linkedin.com/in/nome"
          inputRef={linkedinRef}
        />

        {/* GITHUB */}
        <Input
          name="github"
          id="profile-github"
          label="GitHub"
          defaultValue={profile.github}
          placeholder="https://github.com/nome"
          inputRef={githubRef}
        />

        {/* CV - Importar CV */}
        <ImportCvSection
          inputRef={cvRef}
          text={student.cv ? "Alterar CV" : "Importar CV"}
        />

        {/* BIOGRAFIA */}
        <UserBioTextArea
          id="profile-bio"
          name="Biografia"
          rows={5}
          placeholder="Escreve algo sobre ti..."
          setValue={handleUserBioChange}
          value={profile.bio ? profile.bio : ""}
          limit={LIMIT}
          warningLimit={LIMIT - 30}
        />

        {/* INTERESSES */}
        <fieldset className="min-w-0">
          <legend className="field-label text-gray-100">Interesses</legend>
          <InterestSelector
            alignStart
            availableInterests={availableInterests}
            selectedInterestIds={profile.interests}
            setSelectedInterestIds={setUserInterests}
          />
        </fieldset>

        {/* BOTÃO GUARDAR */}
        <PrimaryButton
          onClick={handleSave}
          loading={isLoading}
          variant="form"
          className="mt-3 h-12 w-full field-focus-target text-base font-medium text-white"
        >
          Guardar
        </PrimaryButton>
      </div>
    </section>
  );
};

export default ProfileSection;

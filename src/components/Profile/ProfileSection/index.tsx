"use client";

import { Dispatch, SetStateAction, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { ProfileData } from "@/types/ProfileData";
import { httpClient } from "@/lib/http/client";
import { useMutation } from "@/hooks/useMutation";
import { useUiText } from "@/contexts/UiLanguageContext";
import Input from "@/components/ui/Input";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ImportCvSection from "@/components/Profile/ImportCvSection";
import InterestSelector from "@/components/Profile/InterestSelector";
import UserBioTextArea from "@/components/Profile/UserBioTextArea";
import type { InterestDto } from "@/application/dto/interestDto";
import type { StudentDto } from "@/application/dto/studentDto";
import { uploadCv } from "@/client/api/upload";
import { githubOrEmptySchema } from "@/schemas/githubUrlSchema";
import {
  isValidLinkedinUrl,
  LINKEDIN_FORMAT_ERROR,
} from "@/schemas/linkedinSchema";
import { isIsepEmail } from "@/utils/isepEmail";

interface ProfileSectionProps {
  student: StudentDto;
  profile: ProfileData;
  setProfile: Dispatch<SetStateAction<ProfileData>>;
  setActiveTab: Dispatch<SetStateAction<"Sumário" | "Perfil" | "Desafios">>;
  availableInterests: InterestDto[];
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  student,
  profile,
  setProfile,
  setActiveTab,
  availableInterests,
}) => {
  const t = useUiText();

  const LIMIT = 255;
  const router = useRouter();

  const courseRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
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
    const course = courseRef.current?.value.trim() ?? "";
    const name = nameRef.current?.value.trim() ?? "";
    if (!name) {
      toast.error("Por favor, indica o teu nome.");
      return;
    }
    const courseChanged = course !== (student.course ?? "");
    if (courseChanged && !course) {
      toast.error("Por favor, indica o teu curso.");
      return;
    }
    if (profile.bio && profile.bio?.length > LIMIT) {
      toast.error(
        t("A tua bio não pode ter mais de {value} caracteres!", {
          value: LIMIT,
        })
      );
      return;
    }

    if (!isIsepEmail(emailRef.current?.value ?? "")) {
      toast.error(t("Insere um email institucional válido."));
      return;
    }

    const linkedin = linkedinRef.current?.value.trim() ?? "";
    const github = githubRef.current?.value.trim() ?? "";
    const linkedinChanged = linkedin !== (profile.linkedin ?? "").trim();
    const githubChanged = github !== (profile.github ?? "").trim();

    // Validação LinkedIn
    if (linkedinChanged && linkedin && !isValidLinkedinUrl(linkedin)) {
      toast.error(LINKEDIN_FORMAT_ERROR);
      return;
    }

    if (githubChanged && !githubOrEmptySchema.safeParse(github).success) {
      toast.error(t("O teu Github não segue o formato correto!"));
      return;
    }

    mutateSave(async () => {
      if (cvRef.current?.files?.length) {
        const cvFile = cvRef.current.files[0]!;
        const uploaded = await uploadCv(cvFile, (message) =>
          toast.error(t(message))
        );
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
        name,
        bio: profile.bio ? profile.bio : undefined,
        ...(githubChanged ? { github } : {}),
        ...(linkedinChanged ? { linkedin } : {}),
        interests: profile.interests,
        institutionalEmail: emailRef.current?.value,
        ...(courseChanged ? { course } : {}),
      });

      setProfile((previous) => ({
        ...previous,
        linkedin: linkedin || null,
        github: github || null,
      }));

      if (profile.avatar) {
        try {
          await httpClient.post(`/students/${student.code}/avatar`, {
            url: profile.avatar,
          });
        } catch (error) {
          console.error("Avatar save failed:", error);
        }
      }

      toast.success(t("Perfil atualizado com sucesso!"));
      setActiveTab("Perfil");
      router.refresh();
    });
  };

  return (
    <section className="student-profile-form w-full">
      <h2 className="mb-5 text-center font-sans text-2xl font-semibold text-white lg:text-left lg:text-[1.75rem]">
        {t("Informações pessoais")}
      </h2>
      <div className="flex flex-col gap-y-4">
        {/* NOME */}
        <Input
          name="name"
          id="profile-name"
          label={t("Nome")}
          defaultValue={student.name}
          inputRef={nameRef}
          maxLength={100}
        />

        {/* CURSO */}
        <Input
          name="course"
          id="profile-course"
          label={t("Curso")}
          defaultValue={student.course ?? ""}
          inputRef={courseRef}
          maxLength={100}
          placeholder={t("Ex.: Engenharia Informática")}
        />

        {/* ANO */}
        <Input
          name="year"
          id="profile-year"
          label={t("Ano")}
          value={t(student.year)}
          readOnly
          hint={t("Definido no registo.")}
        />

        {/* EMAIL */}
        <Input
          name="email"
          id="profile-email"
          label={t("Email institucional")}
          type="email"
          inputRef={emailRef}
          defaultValue={student.user.email}
          maxLength={254}
          hint={t("Email do ISEP para o teu perfil.")}
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
          text={student.cv ? "Alterar CV" : t("Importar CV")}
        />

        {/* BIOGRAFIA */}
        <UserBioTextArea
          id="profile-bio"
          name={t("Biografia")}
          rows={5}
          placeholder={t("Escreve algo sobre ti...")}
          setValue={handleUserBioChange}
          value={profile.bio ? profile.bio : ""}
          limit={LIMIT}
          warningLimit={LIMIT - 30}
        />

        {/* INTERESSES */}
        <fieldset className="min-w-0">
          <legend className="field-label text-gray-100">
            {t("Interesses")}
          </legend>
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
          {t("Guardar")}
        </PrimaryButton>
      </div>
    </section>
  );
};

export default ProfileSection;

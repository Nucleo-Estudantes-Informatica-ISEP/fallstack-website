"use client";

import { Dispatch, SetStateAction, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Student, User } from "@prisma/client";
import Skeleton from "react-loading-skeleton";
import swal from "sweetalert";

import { ProfileData } from "@/types/ProfileData";
import { uploadCv as uploadCvToSupabase } from "@/lib/upload";
import { BASE_URL } from "@/services/api";

import PrimaryButton from "@/components/PrimaryButton";
import ImportCvSection from "@/components/Profile/ImportCvSection";
import Input from "@/components/Profile/Input";
import InterestSelector from "@/components/Profile/InterestSelector";
import UserBioTextArea from "@/components/Profile/UserBioTextArea";

interface SettingsSectionProps {
  student: Student & { user: User };
  profile: ProfileData;
  setProfile: Dispatch<SetStateAction<ProfileData>>;
  setActiveTab: Dispatch<
    SetStateAction<"Sumário" | "Perfil" | "Desafios" | "Definições">
  >;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  student,
  profile,
  setProfile,
  setActiveTab,
}) => {
  const LIMIT = 255;
  const router = useRouter();

  const githubRef = useRef<HTMLInputElement>(null);
  const linkedinRef = useRef<HTMLInputElement>(null);
  const cvRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  function handleUserBioChange(bio: string) {
    if (bio.length > LIMIT) return;
    setProfile({ ...profile, bio });
  }

  function setUserInterests(interests: string[]) {
    setProfile({ ...profile, interests });
  }

  const handleSave = async () => {
    if (profile.bio && profile.bio?.length > LIMIT) {
      swal(`A tua bio não pode ter mais de ${LIMIT} caracteres!`);
      return;
    }

    // Validação LinkedIn
    if (
      linkedinRef.current?.value &&
      !linkedinRef.current?.value?.match(
        /^(https:\/\/www\.linkedin\.com\/in\/)([A-zÀ-ú0-9ç_-]+\/?)+$/
      )
    ) {
      swal("O teu Linkedin não segue o formato correto!");
      return;
    }

    // Validação Github
    if (
      githubRef.current?.value &&
      !githubRef.current?.value?.match(
        /^(https:\/\/github\.com\/)([A-zÀ-ú0-9ç_-]+\/?)+$/
      )
    ) {
      swal("O teu Github não segue o formato correto!");
      return;
    }

    setIsLoading(true);

    setProfile({
      ...profile,
      linkedin: linkedinRef.current?.value || null,
      github: githubRef.current?.value || null,
    });

    if (cvRef.current?.files?.length) {
      const cvFile = cvRef.current.files[0]!;
      const uploaded = await uploadCvToSupabase(cvFile);
      if (uploaded) {
        await fetch(`${BASE_URL}/students/${student.code}/cv`, {
          method: "POST",
          body: JSON.stringify({ id: uploaded.id }),
        });
      }
    }

    const res = await fetch(`${BASE_URL}/students/${student.code}`, {
      method: "PATCH",
      body: JSON.stringify({
        bio: profile.bio ? profile.bio : undefined,
        github: githubRef.current?.value,
        linkedin: linkedinRef.current?.value,
        interests: profile.interests,
      }),
    });

    if (res.status === 200) {
      setIsLoading(false);
      swal("Perfil atualizado com sucesso!");
      setActiveTab("Perfil");
      router.refresh();
    } else {
      setIsLoading(false);
      swal("Erro ao atualizar perfil.");
    }
  };

  return (
    <section 
      className="w-full rounded bg-[#111111] p-6 shadow-2xl md:p-8 antialiased"
      style={{
        textRendering: "optimizeLegibility",
      }}
    >
      <h2 className="mb-8 text-2xl font-bold text-gray-100 tracking-tight">
        Informações pessoais
      </h2>

      <div className="flex flex-col gap-y-5">
        {student ? (
          <>
            {/* NOME */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-100">Nome</label>
              <div className="border border-white bg-transparent">
                <Input 
                  name="" 
                  defaultValue={student.name} 
                  disabled={true} 
                  className="w-full bg-transparent border-none focus:ring-0 text-gray-100 px-3 py-2" 
                />
              </div>
            </div>
            
            {/* ANO */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-100">Ano</label>
              <div className="border border-white bg-transparent">
                <Input 
                  name="" 
                  defaultValue={student.year} 
                  disabled={true} 
                  className="w-full bg-transparent border-none focus:ring-0 text-gray-100 px-3 py-2" 
                />
              </div>
            </div>

            {/* EMAIL */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-100">Email</label>
              <div className="border border-white bg-transparent">
                <Input
                  name=""
                  defaultValue={student.user.email}
                  disabled={true}
                  className="w-full bg-transparent border-none focus:ring-0 text-gray-100 px-3 py-2"
                />
              </div>
            </div>
          </>
        ) : (
          <Skeleton height={40} count={3} />
        )}

        {/* LINKEDIN */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-100">LinkedIn</label>
          <div className="border border-white bg-transparent">
            <Input
              name=""
              defaultValue={profile.linkedin}
              placeholder="https://www.linkedin.com/in/nome"
              inputRef={linkedinRef}
              className="w-full bg-transparent border-none focus:ring-0 text-gray-100 placeholder:text-gray-500 px-3 py-2"
            />
          </div>
        </div>

        {/* GITHUB */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-100">Github</label>
          <div className="border border-white bg-transparent">
            <Input
              name=""
              defaultValue={profile.github}
              placeholder="https://github.com/example"
              inputRef={githubRef}
              className="w-full bg-transparent border-none focus:ring-0 text-gray-100 placeholder:text-gray-500 px-3 py-2"
            />
          </div>
        </div>

        {/* CV - Importar CV */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-100">CV</label>
          <div className="border border-white bg-transparent p-2 text-gray-100 flex items-center">
            {/* Forçamos a cor branca aqui dentro para o texto do botão */}
            <div className="w-full text-white [&>button]:text-white [&>div]:text-white">
              <ImportCvSection
                inputRef={cvRef}
                text={student.cv ? "Alterar CV" : "Importar CV"}
              />
            </div>
          </div>
        </div>

        {/* BIOGRAFIA */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-100">Biografia</label>
          <div className="border border-white bg-transparent p-2">
            <UserBioTextArea
              name=""
              defaultValue={profile.bio}
              rows={5}
              placeholder="Escreve algo sobre ti..."
              setValue={handleUserBioChange}
              value={profile.bio ? profile.bio : ""}
              limit={LIMIT}
              warningLimit={LIMIT - 30}
              className="bg-transparent border-none text-gray-100 w-full resize-none focus:outline-none placeholder:text-gray-500"
            />
          </div>
          <span className="text-xs text-gray-400">0 / {LIMIT} caracteres</span>
        </div>

        {/* INTERESSES */}
        <InterestSelector
          userInterests={profile.interests}
          setUserInterests={setUserInterests}
        />

        {/* BOTÃO GUARDAR */}
        <PrimaryButton
          onClick={handleSave}
          loading={isLoading}
          className="mt-6 w-full bg-[#8C3E1F] py-3 text-sm font-medium text-white transition-colors hover:bg-[#7A351A]"
        >
          Guardar
        </PrimaryButton>
      </div>
    </section>
  );
};

export default SettingsSection;
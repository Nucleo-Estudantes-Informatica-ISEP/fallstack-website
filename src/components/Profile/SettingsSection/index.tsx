"use client";

import { Dispatch, SetStateAction, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Student, User } from "@prisma/client";
import Skeleton from "react-loading-skeleton";
import swal from "sweetalert";

import { ProfileData } from "@/types/ProfileData";
import {
  uploadAvatar as uploadAvatarToSupabase,
  uploadCv as uploadCvToSupabase,
} from "@/lib/upload";
import { BASE_URL } from "@/services/api";
import Modal from "@/components/Modal";
import PrimaryButton from "@/components/PrimaryButton";
<<<<<<< HEAD
import AvatarCropper from "@/components/Profile/AvatarCropper";
import ImportCvSection from "@/components/Profile/ImportCvSection";
import Input from "@/components/Profile/Input";
import InterestSelector from "@/components/Profile/InterestSelector";
import UserBioTextArea from "@/components/Profile/UserBioTextArea";
import UserImage from "@/components/Profile/UserImage";
import { getCroppedImg } from "@/utils/canvas";

=======


import ImportCvSection from "../ImportCvSection";
import Input from "../Input";
import InterestSelector from "../InterestSelector";
import UserBioTextArea from "../UserBioTextArea";

>>>>>>> f747326 (feat:  Update personal data)
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

    if (
      linkedinRef.current?.value &&
      !linkedinRef.current?.value?.match(
        /^(https:\/\/www\.linkedin\.com\/in\/)([A-zÀ-ú0-9ç_-]+\/?)+$/
      )
    ) {
      swal("O teu Linkedin não segue o formato correto!");
      return;
    }

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
<<<<<<< HEAD
      if (profile.avatar)
        await fetch(`${BASE_URL}/students/${student.code}/avatar`, {
          method: "POST",
          body: JSON.stringify({ url: profile.avatar }),
        });
=======

>>>>>>> f747326 (feat:  Update personal data)

      setIsLoading(false);
      swal("Perfil atualizado com sucesso!");
      setActiveTab("Perfil");
      router.refresh();
    } else {
      setIsLoading(false);
      swal("Ocorreu um erro ao atualizar o teu perfil...");

    }
  };

<<<<<<< HEAD
  const handleConfirmAvatar = async () => {
    setIsAvatarLoading(true);

    if (!imageSrc || !croppedAreaPixels) return;

    const image = await getCroppedImg(imageSrc, croppedAreaPixels);
    if (!image) return setIsAvatarLoading(false);

    const uploaded = await uploadAvatarToSupabase(image);
    if (!uploaded) {
      toast.error("Não foi possível dar upload à imagem.");
      return setIsAvatarLoading(false);
    }

    setIsAvatarLoading(false);
    setIsModalVisible(false);

    setUserImage(uploaded.url);
    // store the URL so the save handler can persist it
    setProfile({ ...profile, avatar: uploaded.url as unknown as string });
  };
=======
>>>>>>> f747326 (feat:  Update personal data)

  return (
    <section className="w-full bg-black p-6 md:p-8 text-gray-300">
      <h1 className="text-3xl font-bold text-white mb-8">Informações pessoais</h1>


      <div className="flex flex-col gap-y-6">
        {student ? (
          <>
            <Input name="Nome" defaultValue={student.name} disabled={true} />
            <Input name="Ano" defaultValue={student.year} disabled={true} />
            <Input
              name="Email"
              defaultValue={student.user.email}
              disabled={true}
            />
          </>
        ) : (
          <Skeleton height={40} count={3} />
        )}

        <Input
          name="Linkedin"
          defaultValue={profile.linkedin}
          placeholder="https://www.linkedin.com/in/example/"
          inputRef={linkedinRef}
        />
        <Input
          name="Github"
          defaultValue={profile.github}
          placeholder="https://github.com/example"
          inputRef={githubRef}
        />

        <ImportCvSection
          inputRef={cvRef}
          text={student.cv ? "Alterar CV" : "Importar CV"}
        />

        <UserBioTextArea
          name="Bio"
          defaultValue={profile.bio}
          rows={5}
          placeholder="Escreve algo sobre ti..."
          setValue={handleUserBioChange}
          value={profile.bio ? profile.bio : ""}
          limit={LIMIT}
          warningLimit={LIMIT - 30}
        />

        <label className="text-lg text-gray-300">Interesses</label>

        <InterestSelector
          userInterests={profile.interests}
          setUserInterests={setUserInterests}
        />

        <PrimaryButton
          onClick={handleSave}
          loading={isLoading}
          className="mt-4 w-full bg-[#8C4B2D] hover:bg-[#7A3F24] text-white py-3 text-lg font-semibold"
        >
          Guardar
        </PrimaryButton>
      </div>


    </section>
  );
};

export default SettingsSection;
"use client";

import { Dispatch, SetStateAction, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Area } from "react-easy-crop";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";

import { ProfileData } from "@/types/ProfileData";
import { httpClient } from "@/lib/http/client";
import { useMutation } from "@/hooks/useMutation";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import PrimaryButton from "@/components/ui/PrimaryButton";
import AvatarCropper from "@/components/Profile/AvatarCropper";
import ImportCvSection from "@/components/Profile/ImportCvSection";
import InterestSelector from "@/components/Profile/InterestSelector";
import UserBioTextArea from "@/components/Profile/UserBioTextArea";
import UserImage from "@/components/Profile/UserImage";
import type { InterestDto } from "@/application/dto/interestDto";
import type { StudentDto } from "@/application/dto/studentDto";
import { uploadAvatar, uploadCv } from "@/client/api/upload";
import { getCroppedImg } from "@/utils/canvas";

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
  const [userImage, setUserImage] = useState<string | null>(student.avatar);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isAvatarLoading, setIsAvatarLoading] = useState<boolean>(false);

  function handleUserBioChange(bio: string) {
    if (bio.length > LIMIT) return;
    setProfile({ ...profile, bio });
  }

  function setUserInterests(interests: string[]) {
    setProfile({ ...profile, interests });
  }

  const handleConfirmAvatar = async () => {
    setIsAvatarLoading(true);

    if (!imageSrc || !croppedAreaPixels) return;

    const image = await getCroppedImg(imageSrc, croppedAreaPixels);
    if (!image) return setIsAvatarLoading(false);

    const uploaded = await uploadAvatar(image);
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

  const handleSave = () => {
    if (profile.bio && profile.bio?.length > LIMIT) {
      toast.error(`A tua bio não pode ter mais de ${LIMIT} caracteres!`);
      return;
    }

    // Validação LinkedIn
    if (
      linkedinRef.current?.value &&
      !linkedinRef.current?.value?.match(
        /^(https:\/\/www\.linkedin\.com\/in\/)([A-zÀ-ú0-9ç_-]+\/?)+$/
      )
    ) {
      toast.error("O teu Linkedin não segue o formato correto!");
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
    <section
      className="w-full rounded bg-[#111111] p-4 antialiased shadow-2xl sm:p-6 xl:p-8"
      style={{
        textRendering: "optimizeLegibility",
      }}
    >
      <div className="mx-auto w-full max-w-2xl">
        <h2 className="mb-8 text-2xl font-bold tracking-tight text-gray-100">
          Informações pessoais
        </h2>

        <div className="flex flex-col gap-y-5">
          <div className="flex justify-center">
            <UserImage
              imageSrc={userImage}
              editable={true}
              setProfile={setProfile}
              onChange={(imgSrc) => {
                setImageSrc(imgSrc);
                setIsModalVisible(true);
              }}
            />
          </div>
          {student ? (
            <>
              {/* NOME */}
              <Input
                name="name"
                id="profile-name"
                label="Nome"
                defaultValue={student.name}
                disabled={true}
                hint="Definido pela tua conta institucional e não pode ser alterado."
              />

              {/* ANO */}
              <Input
                name="year"
                id="profile-year"
                label="Ano"
                defaultValue={student.year}
                disabled={true}
                hint="Definido no registo da conta e não pode ser alterado."
              />

              {/* EMAIL */}
              <Input
                name="email"
                id="profile-email"
                label="Email"
                defaultValue={student.user.email}
                disabled={true}
                hint="Associado à tua conta institucional e não pode ser alterado."
              />
            </>
          ) : (
            <Skeleton height={40} count={3} />
          )}

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
            label="Github"
            defaultValue={profile.github}
            placeholder="https://github.com/example"
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
          <div className="flex flex-col">
            <label className="mb-1.5 text-sm font-medium text-gray-100">
              Interesses
            </label>
            <InterestSelector
              availableInterests={availableInterests}
              selectedInterestIds={profile.interests}
              setSelectedInterestIds={setUserInterests}
            />
          </div>

          {/* BOTÃO GUARDAR */}
          <PrimaryButton
            onClick={handleSave}
            loading={isLoading}
            className="mt-6 h-12 w-full rounded-full bg-[#82360D] py-3 text-base font-semibold text-white transition-colors hover:bg-[#6c2c09]"
          >
            Guardar
          </PrimaryButton>
        </div>
      </div>

      <Modal
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        className="flex flex-col items-center justify-center gap-8"
        aria-labelledby="avatar-modal-title"
      >
        <h1 id="avatar-modal-title" className="text-3xl font-bold">
          Altera o teu Avatar
        </h1>
        <AvatarCropper {...{ imageSrc, setImageSrc, setCroppedAreaPixels }} />
        <PrimaryButton
          className="w-full py-2 text-xl"
          onClick={handleConfirmAvatar}
          loading={isAvatarLoading}
        >
          Confirmar
        </PrimaryButton>
      </Modal>
    </section>
  );
};

export default ProfileSection;

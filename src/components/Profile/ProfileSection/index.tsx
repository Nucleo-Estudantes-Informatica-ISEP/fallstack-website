"use client";

import { Dispatch, SetStateAction, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Area } from "react-easy-crop";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import swal from "sweetalert";

import { ProfileData } from "@/types/ProfileData";
import { useMutation } from "@/hooks/useMutation";
import { BASE_URL } from "@/services/api";
import Modal from "@/components/Modal";
import PrimaryButton from "@/components/PrimaryButton";
import AvatarCropper from "@/components/Profile/AvatarCropper";
import ImportCvSection from "@/components/Profile/ImportCvSection";
import Input from "@/components/Profile/Input";
import InterestSelector from "@/components/Profile/InterestSelector";
import UserBioTextArea from "@/components/Profile/UserBioTextArea";
import UserImage from "@/components/Profile/UserImage";
import type { StudentDto } from "@/application/dto/studentDto";
import {
  uploadAvatar as uploadAvatarToSupabase,
  uploadCv as uploadCvToSupabase,
} from "@/client/api/upload";
import { getCroppedImg } from "@/utils/canvas";

interface ProfileSectionProps {
  student: StudentDto;
  profile: ProfileData;
  setProfile: Dispatch<SetStateAction<ProfileData>>;
  setActiveTab: Dispatch<
    SetStateAction<"Sumário" | "Perfil" | "Desafios" | "Definições">
  >;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
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

  const handleSave = () => {
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

    setProfile({
      ...profile,
      linkedin: linkedinRef.current?.value || null,
      github: githubRef.current?.value || null,
    });

    mutateSave(async () => {
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

      if (!res.ok) {
        throw new Error("Erro ao atualizar perfil.");
      }

      if (profile.avatar) {
        const avatarRes = await fetch(
          `${BASE_URL}/students/${student.code}/avatar`,
          {
            method: "POST",
            body: JSON.stringify({ url: profile.avatar }),
          }
        );

        if (!avatarRes.ok) {
          console.error("Avatar save failed:", await avatarRes.text());
        }
      }

      swal("Perfil atualizado com sucesso!");
      setActiveTab("Perfil");
      router.refresh();
    });
  };

  return (
    <section
      className="w-full rounded bg-[#111111] p-6 antialiased shadow-2xl md:p-8"
      style={{
        textRendering: "optimizeLegibility",
      }}
    >
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
            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-medium text-gray-100"
                htmlFor="profile-name"
              >
                Nome
              </label>
              <div className="border border-white bg-transparent">
                <Input
                  name=""
                  id="profile-name"
                  defaultValue={student.name}
                  disabled={true}
                  className="w-full border-none bg-transparent px-3 py-2 text-gray-100 focus:ring-0"
                />
              </div>
            </div>

            {/* ANO */}
            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-medium text-gray-100"
                htmlFor="profile-year"
              >
                Ano
              </label>
              <div className="border border-white bg-transparent">
                <Input
                  name=""
                  id="profile-year"
                  defaultValue={student.year}
                  disabled={true}
                  className="w-full border-none bg-transparent px-3 py-2 text-gray-100 focus:ring-0"
                />
              </div>
            </div>

            {/* EMAIL */}
            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-medium text-gray-100"
                htmlFor="profile-email"
              >
                Email
              </label>
              <div className="border border-white bg-transparent">
                <Input
                  name=""
                  id="profile-email"
                  defaultValue={student.user.email}
                  disabled={true}
                  className="w-full border-none bg-transparent px-3 py-2 text-gray-100 focus:ring-0"
                />
              </div>
            </div>
          </>
        ) : (
          <Skeleton height={40} count={3} />
        )}

        {/* LINKEDIN */}
        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-medium text-gray-100"
            htmlFor="profile-linkedin"
          >
            LinkedIn
          </label>
          <div className="border border-white bg-transparent">
            <Input
              name=""
              id="profile-linkedin"
              defaultValue={profile.linkedin}
              placeholder="https://www.linkedin.com/in/nome"
              inputRef={linkedinRef}
              className="w-full border-none bg-transparent px-3 py-2 text-gray-100 placeholder:text-gray-500 focus:ring-0"
            />
          </div>
        </div>

        {/* GITHUB */}
        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-medium text-gray-100"
            htmlFor="profile-github"
          >
            Github
          </label>
          <div className="border border-white bg-transparent">
            <Input
              name=""
              id="profile-github"
              defaultValue={profile.github}
              placeholder="https://github.com/example"
              inputRef={githubRef}
              className="w-full border-none bg-transparent px-3 py-2 text-gray-100 placeholder:text-gray-500 focus:ring-0"
            />
          </div>
        </div>

        {/* CV - Importar CV */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-100">CV</label>
          <div className="flex items-center border border-white bg-transparent p-2 text-gray-100">
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
              rows={5}
              placeholder="Escreve algo sobre ti..."
              setValue={handleUserBioChange}
              value={profile.bio ? profile.bio : ""}
              limit={LIMIT}
              warningLimit={LIMIT - 30}
              className="w-full resize-none border-none bg-transparent text-gray-100 placeholder:text-gray-500 focus:outline-none"
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

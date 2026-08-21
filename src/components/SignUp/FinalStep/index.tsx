"use client";

import {
  Dispatch,
  FunctionComponent,
  SetStateAction,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Area } from "react-easy-crop";
import { FaFilePdf } from "react-icons/fa";
import { toast } from "react-toastify";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import useSession from "@/hooks/useSession";
import FileInput from "@/components/ui/FileInput";
import Input from "@/components/ui/Input";
import PrimaryButton from "@/components/ui/PrimaryButton";
import PrivacyPolicyModal from "@/components/ui/PrivacyPolicyModal/page";
import AvatarCropper from "@/components/Profile/AvatarCropper";
import { createStudentProfile } from "@/client/api/auth";
import getSession from "@/client/api/session";
import {
  uploadAvatar as uploadAvatarToSupabase,
  uploadCv as uploadCvToSupabase,
} from "@/client/api/upload";
import { getCroppedImg } from "@/utils/canvas";

interface FinalStepProps {
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  data: StudentSignUpData;
  setData: Dispatch<SetStateAction<StudentSignUpData>>;
}

const FinalStep: FunctionComponent<FinalStepProps> = ({ data, setData }) => {
  const session = useSession();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const linkedinRef = useRef<HTMLInputElement>(null);
  const privacyRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      if (error) setError(null);

      setData({
        ...data,
        cv: {
          name: file.name,
          file,
          preview: URL.createObjectURL(file),
        },
      });
    }
  };

  const handleAvatarUpload = async () => {
    setLoading(true);

    let avatarUrl: string | null = null;
    if (imageSrc && croppedAreaPixels) {
      const image = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!image) {
        setLoading(false);
        return null;
      }

      const uploaded = await uploadAvatarToSupabase(image);
      if (!uploaded) {
        toast.error("Não foi possível dar upload à imagem.");
        setLoading(false);
        return null;
      }
      avatarUrl = uploaded.url;
    }
    setLoading(false);
    return avatarUrl;
  };

  const handleSubmit = async () => {
    try {
      if (!privacyRef.current?.checked) {
        return setError("Tens de aceitar a política de privacidade.");
      }

      setLoading(true);

      // The account and session are established earlier in the wizard via
      // AuthNEI (account creation happens exclusively through it - see
      // AccountDetailsStep) - if there's no session by this point, it
      // expired or was never established, so restart instead of hitting an
      // Unauthorized failure on profile creation below.
      const existingSession = await getSession();

      if (!existingSession) {
        toast.error("A tua sessão expirou. Por favor, tenta novamente.");
        router.push("/signup");
        return setLoading(false);
      }

      if (existingSession.student) {
        // The profile was already created in an earlier attempt.
        session.fetchSession();
        router.push("/");
        router.refresh();
        return;
      }

      // A session belonging to a different account type (e.g. an
      // employee/admin browsing this public page) - not a resumable
      // partial student signup. StudentSignUp's mount-time guard should
      // already have redirected this case away; this is a defense-in-depth
      // check for anyone who reaches this point regardless.
      if (existingSession.role !== "STUDENT") {
        toast.error("Já tens sessão iniciada como outro tipo de conta.");
        return setLoading(false);
      }

      const avatarUrl = await handleAvatarUpload();

      let cvId: string | undefined;
      if (data.cv) {
        const uploaded = await uploadCvToSupabase(data.cv.file);
        if (!uploaded) {
          toast.error("Não foi possível dar upload ao CV.");
        } else {
          cvId = uploaded.id;
        }
      }

      // Add LinkedIn if provided
      const linkedin = linkedinRef.current?.value || null;

      const profile = await createStudentProfile({
        ...data,
        avatarUrl,
        cvId,
        linkedin,
      });

      if (profile instanceof Error) {
        toast.error(profile.message);
        return setLoading(false);
      }

      if (!profile) {
        toast.error("Ocorreu um erro ao criar o perfil.");
        return setLoading(false);
      }

      session.fetchSession();
      router.push("/");
      router.refresh();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex w-[90%] flex-col">
        <p className="mb-8 font-sans text-[45px] font-semibold text-white">
          Criar uma conta
        </p>

        <div className="flex max-h-[60vh] flex-col gap-y-4 overflow-y-auto">
          <FileInput
            name="Insere o teu CV. (Opcional)"
            placeholder="CV ficheiro"
            accept="application/pdf"
            onChange={onFileChange}
            file={data.cv ? data.cv : null}
            icon={<FaFilePdf />}
            onClear={() => setData({ ...data, cv: null })}
            className="z-10"
          />

          <div className="flex w-full flex-col">
            <label
              className="mb-1 text-left text-sm font-normal text-white"
              htmlFor="avatar"
            >
              Insere uma imagem para foto de perfil. (Opcional)
            </label>
            <AvatarCropper
              {...{ imageSrc, setImageSrc, setCroppedAreaPixels }}
            />
          </div>

          <Input
            type="url"
            name="Insere o link do teu perfil do LinkedIn. (Opcional)"
            placeholder="https://linkedin.com/in/o-teu-perfil"
            center
            inputRef={linkedinRef}
            defaultValue={data.linkedin ? data.linkedin : undefined}
            className="z-10"
          />
        </div>

        <label
          htmlFor="privacy"
          className="z-10 mt-4 flex items-start text-white"
        >
          <input
            type="checkbox"
            id="privacy"
            className="mt-1 mr-3 size-4 cursor-pointer appearance-none border border-white bg-background checked:border-white checked:bg-white"
            style={{
              backgroundImage: "none",
            }}
            ref={privacyRef}
            onChange={(e) => {
              if (e.target.checked) {
                e.target.style.backgroundImage = `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='black' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e")`;
              } else {
                e.target.style.backgroundImage = "none";
              }
            }}
          />
          <span>
            Aceito a{" "}
            <button
              type="button"
              onClick={() => setIsModalVisible(true)}
              className="text-orange-500 underline"
            >
              política de privacidade
            </button>
            .
          </span>
        </label>

        <PrivacyPolicyModal
          isVisible={isModalVisible}
          setIsVisible={setIsModalVisible}
        />

        {error && (
          <motion.p
            className="mt-1 text-center text-sm font-bold text-red-600"
            animate={{
              y: [-15, 0],
            }}
            transition={{
              ease: "easeOut",
              duration: 0.2,
            }}
          >
            {error}
          </motion.p>
        )}

        <PrimaryButton
          loading={loading}
          onClick={handleSubmit}
          className="mt-4 mb-5 h-14 w-full font-bold"
        >
          CONCLUIR
        </PrimaryButton>
      </div>
    </div>
  );
};

export default FinalStep;

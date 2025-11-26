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
import { toast } from "react-toastify";
import { FaFilePdf } from "react-icons/fa";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import { signUp } from "@/lib/auth";
import {
  uploadCv,
  uploadAvatar,
  uploadCv as uploadCvToSupabase,
  uploadAvatar as uploadAvatarToSupabase,
} from "@/lib/upload";
import useSession from "@/hooks/useSession";
import Input from "@/components/Input";
import FileInput from "@/components/FileInput";
import PrimaryButton from "@/components/PrimaryButton";
import PrivacyPolicyModal from "@/components/PrivacyPolicyModal/page";
import AvatarCropper from "@/components/Profile/AvatarCropper";
import { getCroppedImg } from "@/utils/canvas";

interface FinalStepProps {
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  data: StudentSignUpData;
  setData: Dispatch<SetStateAction<StudentSignUpData>>;
}

const FinalStep: FunctionComponent<FinalStepProps> = ({
  currentStep,
  setCurrentStep,
  data,
  setData,
}) => {
  const session = useSession();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);
  const [cvLoading, setCvLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const linkedinRef = useRef<HTMLInputElement>(null);
  const privacyRef = useRef<HTMLInputElement>(null);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLoading(true);
      const file = e.target.files[0];

      if (error) setError(null);

      const uploaded = await uploadCvToSupabase(file);
      if (!uploaded) {
        setError("Ocorreu um erro ao dar upload.");
        return setLoading(false);
      }

      const cv = {
        name: file.name,
        id: uploaded.id,
        preview: URL.createObjectURL(file),
      };

      setData({ ...data, cv });
      setLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    setLoading(true);

    let avatarUrl: string | null = null;
    if (imageSrc && croppedAreaPixels) {
      const image = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!image) return setLoading(false);


      const uploaded = await uploadAvatarToSupabase(image);
      if (!uploaded) {
        toast.error("Não foi possível dar upload à imagem.");
        return setLoading(false);
      }
      avatarUrl = uploaded.url;
    }
    setLoading(false);
    return avatarUrl;
  }

  const handleSubmit = async () => {
    try {
      if (!privacyRef.current?.checked) {
        return setError("Tens de aceitar a política de privacidade.");
      }

      setLoading(true);
      const avatarUrl = await handleAvatarUpload();

      // Add LinkedIn if provided
      const linkedin = linkedinRef.current?.value || null;

      const signup = await signUp({ ...data, avatarUrl, linkedin });

      if (signup instanceof Error) {
        toast.error(signup.message);
        return setLoading(false);
      }

      if (!signup) {
        toast.error("Ocorreu um erro ao criar a conta.");
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
    <div className="flex flex-col w-full items-center">
      <div className="w-[90%] flex flex-col">
        <p className="font-sans text-[45px] font-semibold text-white mb-8">
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

          <div className="w-full flex flex-col">
            <label className="text-sm font-normal text-white mb-1 text-left" htmlFor="avatar">
              Insere uma imagem para foto de perfil. (Opcional)
            </label>
            <AvatarCropper {...{ imageSrc, setImageSrc, setCroppedAreaPixels }} />
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

        <label htmlFor="privacy" className="z-10 mt-4 flex items-start text-white">
          <input
            type="checkbox"
            id="privacy"
            className="mr-3 mt-1 size-4 appearance-none border border-white bg-[#141414] cursor-pointer checked:bg-white checked:border-white"
            style={{
              backgroundImage: 'none',
            }}
            ref={privacyRef}
            onChange={(e) => {
              if (e.target.checked) {
                e.target.style.backgroundImage = `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='black' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e")`;
              } else {
                e.target.style.backgroundImage = 'none';
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
          loading={loading || cvLoading}
          onClick={handleSubmit}
          className="mb-5 mt-4 font-bold w-full h-14"
        >
          CONCLUIR
        </PrimaryButton>
      </div>
    </div>
  );
};

export default FinalStep;

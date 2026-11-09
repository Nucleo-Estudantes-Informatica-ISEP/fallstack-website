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
import { MdLink, MdOutlineCloudUpload } from "react-icons/md";
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
import { uploadAvatar, uploadCv } from "@/client/api/upload";
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

      const uploaded = await uploadAvatar(image);
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
        const uploaded = await uploadCv(data.cv.file);
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
    <div className="flex w-full flex-col">
      <h1 className="mb-8 font-title text-4xl text-white lg:mb-16 lg:text-5xl">
        Criar uma conta
      </h1>

      <div className="flex flex-col gap-y-3 [--field-icon-padding:3.125rem] lg:gap-y-4">
        <FileInput
          name="Insere o teu CV. (Opcional)"
          placeholder="Insere um ficheiro"
          accept="application/pdf"
          onChange={onFileChange}
          file={data.cv ? data.cv : null}
          icon={data.cv ? <FaFilePdf /> : <MdOutlineCloudUpload />}
          onClear={() => setData({ ...data, cv: null })}
        />

        <div className="flex w-full flex-col">
          <label
            className="field-label text-left font-medium text-gray-100"
            htmlFor="avatar"
          >
            Insere uma imagem para foto de perfil. (Opcional)
          </label>
          <AvatarCropper {...{ imageSrc, setImageSrc, setCroppedAreaPixels }} />
        </div>

        <Input
          type="url"
          name="Insere o link do teu perfil do LinkedIn. (Opcional)"
          placeholder="Insere um link"
          icon={<MdLink className="text-lg" />}
          center
          inputRef={linkedinRef}
          defaultValue={data.linkedin ? data.linkedin : undefined}
        />
      </div>

      <div className="mt-5 flex items-center gap-3 text-sm text-white">
        <input
          type="checkbox"
          id="privacy"
          aria-label="Aceito a política de privacidade"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "signup-privacy-error" : undefined}
          className="grid size-5 shrink-0 cursor-pointer field-focus-target appearance-none place-content-center border border-white after:hidden after:h-2.5 after:w-1.5 after:rotate-45 after:border-r-2 after:border-b-2 after:border-background checked:bg-white checked:after:block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary forced-colors:appearance-auto forced-colors:after:hidden"
          ref={privacyRef}
          onChange={() => setError(null)}
        />
        <span>
          <label htmlFor="privacy">Aceito a</label>{" "}
          <button
            type="button"
            onClick={() => setIsModalVisible(true)}
            className="rounded-sm text-orange-400 underline hover:text-orange-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            política de privacidade
          </button>
          .
        </span>
      </div>

      <PrivacyPolicyModal
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
      />

      {error && (
        <motion.p
          id="signup-privacy-error"
          role="alert"
          className="mt-2 text-sm text-red-400"
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
        variant="form"
        className="mt-8 h-12 w-full font-semibold lg:mt-10 lg:h-16 lg:text-xl"
      >
        Concluir
      </PrimaryButton>
    </div>
  );
};

export default FinalStep;

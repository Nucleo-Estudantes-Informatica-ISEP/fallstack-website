import { Dispatch, FunctionComponent, SetStateAction, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { FaFilePdf } from "react-icons/fa";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import { getSignedUrl, uploadToBucket } from "@/lib/upload";
import FileInput from "@/components/FileInput";
import PrimaryButton from "@/components/PrimaryButton";

interface CvStepProps {
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  data: StudentSignUpData;
  setData: Dispatch<SetStateAction<StudentSignUpData>>;
}

const CvStep: FunctionComponent<CvStepProps> = ({
  currentStep,
  setCurrentStep,
  data,
  setData,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLoading(true);
      const file = e.target.files[0];

      const signed = await getSignedUrl("cv", file.type);
      if (!signed) {
        setError("Ocorreu um erro ao dar upload.");
        return setLoading(false);
      }

      if (file.size > signed.maxSize) {
        setLoading(false);
        return setError("O ficheiro é demasiado grande.");
      }

      if (error) setError(null);

      const res = await uploadToBucket(signed, file);

      if (res.status !== 200) {
        setError("Ocorreu um erro ao dar upload.");
        return setLoading(false);
      }

      const cv = {
        name: file.name,
        id: signed.id,
        preview: URL.createObjectURL(file),
      };

      setData({ ...data, cv });
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full items-center">
      <div className="w-[90%] flex flex-col">
        <p className="font-sans text-[45px] font-semibold text-white mb-8">
          Adiciona o teu CV
        </p>

        <p className="font-sans text-sm font-normal text-white mb-4">
          Faz upload do teu currículo em formato PDF. (Opcional)
        </p>

        <FileInput
          name="Insere um ficheiro"
          placeholder="CV ficheiro"
          accept="application/pdf"
          onChange={onFileChange}
          file={data.cv ? data.cv : null}
          icon={<FaFilePdf />}
          onClear={() => setData({ ...data, cv: null })}
          className="z-10"
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
          onClick={handleNext}
          className="mb-5 mt-4 font-bold w-full h-14"
        >
          Seguinte
        </PrimaryButton>
      </div>
    </div>
  );
};
export default CvStep;

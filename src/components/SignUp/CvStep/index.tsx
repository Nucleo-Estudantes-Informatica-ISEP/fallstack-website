// deprecated

"use client";

import { Dispatch, FunctionComponent, SetStateAction, useState } from "react";
import { motion } from "framer-motion";
import { FaFilePdf } from "react-icons/fa";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import FileInput from "@/components/FileInput";
import PrimaryButton from "@/components/PrimaryButton";
import { uploadCv as uploadCvToSupabase } from "@/client/api/upload";

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

      if (error) setError(null);

      const uploaded = await uploadCvToSupabase(file);
      if (!uploaded) {
        setError("Ocorreu um erro ao dar upload.");
        return setLoading(false);
      }

      const cv = {
        name: file.name,
        file,
        preview: URL.createObjectURL(file),
      };

      setData({ ...data, cv });
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex w-[90%] flex-col">
        <p className="mb-8 font-sans text-[45px] font-semibold text-white">
          Adiciona o teu CV
        </p>

        <p className="mb-4 font-sans text-sm font-normal text-white">
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
          className="mt-4 mb-5 h-14 w-full font-bold"
        >
          Seguinte
        </PrimaryButton>
      </div>
    </div>
  );
};
export default CvStep;

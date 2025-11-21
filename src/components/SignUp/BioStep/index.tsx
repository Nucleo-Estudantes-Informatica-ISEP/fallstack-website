import { Dispatch, FunctionComponent, SetStateAction, useRef } from "react";
import Image from "next/image";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import PrimaryButton from "@/components/PrimaryButton";
import UserBioTextArea from "@/components/Profile/UserBioTextArea";

interface BioStepProps {
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  data: StudentSignUpData;
  setData: Dispatch<SetStateAction<StudentSignUpData>>;
}

const BioStep: FunctionComponent<BioStepProps> = ({
  currentStep,
  setCurrentStep,
  data,
  setData,
}) => {
  const LIMIT = 255;
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleNext = () => {
    if (inputRef.current?.value)
      setData({ ...data, bio: inputRef.current.value });
    setCurrentStep(currentStep + 1);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      // shift
      if (e.shiftKey) return;

      // remove new line (last char)
      if (inputRef?.current?.value)
        inputRef.current.value = inputRef.current.value.slice(0, -1);

      handleNext();
    }
  };

  function handleUserBioChange(bio: string) {
    if (bio.length > LIMIT) return;
    setData({ ...data, bio });
  }
  return (
    <div className="flex flex-col w-full items-center">
      <div className="w-[90%] flex flex-col">
        <p className="font-sans text-[45px] font-semibold text-white mb-8">
          Criar uma conta
        </p>

        <UserBioTextArea
          name="Conta-nos mais sobre ti. (Opcional)"
          ref={inputRef}
          placeholder=""
          className="mb-4"
          value={data.bio ? data.bio : ""}
          defaultValue={""}
          autofocus={true}
          setValue={handleUserBioChange}
          limit={LIMIT}
          warningLimit={LIMIT - 30}
        />

        <PrimaryButton onClick={handleNext} className="mb-5 mt-4 font-bold w-full h-14">
          Seguinte
        </PrimaryButton>
      </div>
    </div>
  );
};
export default BioStep;

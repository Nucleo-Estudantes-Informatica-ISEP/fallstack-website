import { FunctionComponent } from "react";

import HeadingText from "@/components/ui/HeadingText";
import { Language } from "@/domain/i18n/translations";

const PassSection: FunctionComponent<{ language?: Language }> = ({
  language = Language.PT,
}) => {
  const isEnglish = language === Language.EN;
  return (
    <>
      <section className="flex w-full flex-col items-center bg-background px-6 pb-20 text-center">
        <HeadingText
          className="font-normal!"
          text={isEnglish ? "FallStack Pass" : "Passe do FallStack"}
        />
        <p className="w-full max-w-2xl text-lg leading-relaxed text-balance sm:text-xl">
          {isEnglish
            ? "You can now access your personal event pass, giving you access to talks and exclusive giveaways."
            : "Podes agora aceder ao teu passe pessoal do evento que te dá acesso às palestras e a giveaways exclusivos."}
        </p>
      </section>
    </>
  );
};

export default PassSection;

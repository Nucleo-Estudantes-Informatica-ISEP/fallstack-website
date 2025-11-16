import { FunctionComponent } from "react";

interface InfoBitProps {
  icon: React.ReactNode;
  info: string;
}

const InfoBit: FunctionComponent<InfoBitProps> = ({ icon, info }) => {
  return (
    <span className="flex items-center gap-2 text-center sm:text-left lg:w-auto">
      <span className="text-2xl sm:text-3xl">{icon}</span>
      <p className="max-w-[32ch] text-base font-medium text-balance sm:text-lg">
        {info}
      </p>
    </span>
  );
};

export default InfoBit;

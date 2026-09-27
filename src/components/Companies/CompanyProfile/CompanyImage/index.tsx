"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import type { CompanyDto } from "@/application/dto/companyDto";

interface UserImageProps {
  company: CompanyDto;
}

const CompanyImage: React.FC<UserImageProps> = ({ company }) => {
  if (!company.avatar?.trim()) return null;

  return (
    <motion.div
      initial="initial"
      whileHover="hover"
      className="relative my-8 flex size-full flex-col items-center"
    >
      <Image
        width={400}
        height={400}
        src={company.avatar}
        alt={`${company.name} logo`}
        className="size-3/4 drop-shadow-[0px_0px_20px_#c0c0c0]"
      />
    </motion.div>
  );
};

export default CompanyImage;

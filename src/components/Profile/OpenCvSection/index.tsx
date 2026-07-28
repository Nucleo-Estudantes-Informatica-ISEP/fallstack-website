"use client";

import React from "react";

import { httpClient } from "@/lib/http/client";
import { OpenCv } from "@/components/ui/Icons";
import type { StudentDto } from "@/application/dto/studentDto";

interface OpenCvProps {
  student: Pick<StudentDto, "code">;
  text: string;
}

const OpenCvSection: React.FC<OpenCvProps> = ({ student, text }) => {
  const handleCv = async (student: Pick<StudentDto, "code">) => {
    const { url } = await httpClient.get<{ url: string }>(
      `/students/${student.code}/cv`
    );
    window.open(url, "_blank");
  };
  return (
    <div className="my-4 flex flex-col space-y-2 px-12 text-black">
      <div className="flex">
        <h3 className="text-left text-xl font-bold text-gray-600">
          Curriculum Vitae
        </h3>
      </div>
      <div className="flex items-center hover:cursor-pointer hover:text-primary">
        <OpenCv className="mb-1 size-5"></OpenCv>
        <button
          type="button"
          onClick={() => handleCv(student)}
          className="cursor-pointer pl-2 underline"
        >
          {text}
        </button>
      </div>
    </div>
  );
};

export default OpenCvSection;

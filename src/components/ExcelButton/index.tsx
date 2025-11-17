"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

import Spinner from "@/components/Spinner";

import download from "downloadjs";

interface SavedStudent {
  studentId: string;
  createdAt: Date;
  student: {
    name: string;
    user: {
      email: string;
    };
  };
  id?: string;
}

interface ExcelButtonProps {
  className?: string;
  data: SavedStudent[];
}

const ExcelButton: React.FC<ExcelButtonProps> = ({
  className,
  data,
  ...rest
}) => {
  const handleDownload = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const dataJSON = data.map((scan) => {
      return {
        id: scan.id ?? `${scan.studentId}-${scan.createdAt.toISOString()}`,
        studentId: scan.studentId,
        studentName: scan.student.name,
        studentEmail: scan.student.user.email,
        createdAt: scan.createdAt.toLocaleString(),
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataJSON);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });

    download(blob, `scans.xlsx`, "application/octet-stream");
    setIsLoading(false);
  };

  const [isLoading, setIsLoading] = useState<boolean>(false);

  return (
    <button
      {...rest}
      onClick={handleDownload}
      disabled={isLoading}
      className={`rounded-lg border border-transparent bg-primary px-4 py-1 text-center
        text-sm leading-5 text-white transition-opacity duration-200 focus:outline-none focus:ring active:bg-primary disabled:opacity-80 ${className}`}
    >
      {isLoading ? <Spinner /> : "Export to Excel"}
    </button>
  );
};

export default ExcelButton;

"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

import Spinner from "@/components/ui/Spinner";
import type { AdminScanDto } from "@/application/dto/historyDto";

import download from "downloadjs";

interface ExcelButtonProps {
  className?: string;
  data?: AdminScanDto[];
  rows?: Record<string, string>[];
  filename?: string;
  headers?: string[];
  format?: "xlsx" | "csv";
}

const ExcelButton: React.FC<ExcelButtonProps> = ({
  className,
  data = [],
  rows,
  headers,
  filename = "scans",
  format = "xlsx",
  ...rest
}) => {
  const handleDownload = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const dataJSON =
        rows ??
        data.map((scan) => {
          return {
            id: scan.id,
            studentId: scan.studentId,
            studentName: scan.student.name,
            studentEmail: scan.student.user.email,
            createdAt: new Date(scan.createdAt).toLocaleString(),
          };
        });
      const worksheet = XLSX.utils.json_to_sheet(
        dataJSON.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              key,
              format === "csv" &&
              typeof value === "string" &&
              /^[=+\-@\t\r\n]/.test(value)
                ? `'${value}`
                : value,
            ])
          )
        ),
        { header: headers }
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

      const excelBuffer = XLSX.write(workbook, {
        bookType: format,
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      download(blob, `${filename}.${format}`, "application/octet-stream");
    } finally {
      setIsLoading(false);
    }
  };

  const [isLoading, setIsLoading] = useState<boolean>(false);

  return (
    <button
      {...rest}
      onClick={handleDownload}
      disabled={isLoading}
      className={`rounded-lg border border-transparent bg-primary px-4 py-1 text-center text-sm leading-5 text-white transition-opacity duration-200 focus:ring focus:outline-none active:bg-primary disabled:opacity-80 ${className}`}
    >
      {isLoading ? (
        <Spinner />
      ) : format === "csv" ? (
        "Export to CSV"
      ) : (
        "Export to Excel"
      )}
    </button>
  );
};

export default ExcelButton;

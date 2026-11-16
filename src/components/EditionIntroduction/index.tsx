import React from "react";

import { offseasonContent } from "@/edition/offseason";

export default function EditionIntroduction({
  language,
  className,
}: {
  language: "PT" | "EN";
  className?: string;
}) {
  return <p className={className}>{offseasonContent[language].next}</p>;
}

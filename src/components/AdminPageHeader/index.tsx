import type { ReactNode } from "react";

import UiText from "@/components/ui/UiText";

interface AdminPageHeaderProps {
  title: string;
  children?: ReactNode;
}

export default function AdminPageHeader({
  title,
  children,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-gray-800">
        <UiText text={title} />
      </h1>

      {children && (
        <div className="flex flex-wrap items-center gap-3">{children}</div>
      )}
    </div>
  );
}

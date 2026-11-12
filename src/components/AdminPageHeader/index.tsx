import type { ReactNode } from "react";

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
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>

      {children && (
        <div className="flex flex-wrap items-center gap-3">{children}</div>
      )}
    </div>
  );
}

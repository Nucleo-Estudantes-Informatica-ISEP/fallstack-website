import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import UiText from "@/components/ui/UiText";

/** Dashboard entry point to the attendance scanner, shown to NEI staff only. */
const StaffAttendanceCard: React.FC = () => (
  <div className="mb-6 w-full max-w-md rounded-2xl border-2 border-ui-highlight bg-linear-to-br from-[#3a220c] to-[#1a1209] p-4 text-white">
    <h2 className="text-lg font-bold text-white">
      <UiText text="Staff NEI · Presenças" />
    </h2>
    <p className="mt-1 mb-3 text-sm text-gray-200">
      <UiText text="Regista os check-ins de quem entra nas sessões." />
    </p>
    <Link
      href="/attendance/scan"
      prefetch={false}
      className="inline-flex items-center gap-2 rounded-full bg-ui-highlight px-4 py-2 text-sm font-bold text-gray-900"
    >
      <UiText text="Abrir leitor de presenças" />
      <FiArrowRight className="size-4" aria-hidden />
    </Link>
  </div>
);

export default StaffAttendanceCard;

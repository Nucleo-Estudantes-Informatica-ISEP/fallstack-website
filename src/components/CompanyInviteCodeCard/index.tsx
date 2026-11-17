"use client";

import { useState } from "react";
import { toast } from "react-toastify";

import { httpClient, HttpClientError } from "@/lib/http/client";
import { useUiText } from "@/contexts/UiLanguageContext";
import UiText from "@/components/ui/UiText";

interface CompanyInviteCodeCardProps {
  companyId: string;
  hasInviteCode: boolean;
  initialUpdatedAt: string | null;
}

const CompanyInviteCodeCard: React.FC<CompanyInviteCodeCardProps> = ({
  companyId,
  hasInviteCode,
  initialUpdatedAt,
}) => {
  const t = useUiText();

  const [configured, setConfigured] = useState(hasInviteCode);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await httpClient.post<{
        code: string;
        updatedAt: string;
      }>(`/admin/companies/${companyId}/invite-code`);
      setGeneratedCode(response.code);
      setConfigured(true);
      setUpdatedAt(response.updatedAt);
      toast.success(t("Código de colaborador gerado."));
    } catch (error) {
      toast.error(
        error instanceof HttpClientError
          ? error.message
          : t("Não foi possível gerar o código.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      toast.success(t("Código copiado."));
    } catch {
      toast.error(t("Não foi possível copiar o código."));
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {t("Código de convite de colaborador")}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {configured
              ? `${t("Código ativo")}${updatedAt ? ` ${t("(atualizado em {value})", { value: new Date(updatedAt).toLocaleString("en-GB") })}` : ""}. ${t("Gerar um novo código invalida o anterior.")}`
              : t("Ainda não foi gerado nenhum código para esta empresa.")}
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={handleGenerate}
          className="ui-focus inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-ui-action px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {loading
            ? "A gerar..."
            : configured
              ? t("Gerar novo código")
              : t("Gerar código")}
        </button>
      </div>

      {generatedCode && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-900">
            {t(
              "Guarda ou partilha este código agora — por segurança, apenas o hash fica guardado e não voltará a ser mostrado."
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded bg-white px-3 py-2 font-mono text-sm text-gray-900 select-all">
              {generatedCode}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="ui-focus inline-flex min-h-11 items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              {" "}
              <UiText text="Copiar" />{" "}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyInviteCodeCard;

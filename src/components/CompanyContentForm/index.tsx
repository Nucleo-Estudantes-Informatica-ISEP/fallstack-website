"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient, HttpClientError } from "@/lib/http/client";
import { useUiText } from "@/contexts/UiLanguageContext";
import AdminForm, { type AdminFormValue } from "@/components/AdminForm";
import { FACT_ICON_NAMES, isFactIconName } from "@/domain/company/factIcons";

export interface CompanyContentValue {
  companyId: string;
  bodyText: string;
  videoTitle: string | null;
  videoHref: string | null;
  socialLinks: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  };
  facts: { iconName: string; description: string }[];
  interestIds: string[];
}

interface CompanyContentFormProps {
  content: CompanyContentValue;
  interestOptions: { id: string; name: string }[];
}

function factsToText(facts: { iconName: string; description: string }[]) {
  return facts.map((fact) => `${fact.iconName}|${fact.description}`).join("\n");
}

function parseFactsText(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [iconName, ...rest] = line.split("|");
      return { iconName: iconName.trim(), description: rest.join("|").trim() };
    })
    .filter((fact) => fact.description && isFactIconName(fact.iconName));
}

const CompanyContentForm: React.FC<CompanyContentFormProps> = ({
  content,
  interestOptions,
}) => {
  const t = useUiText();

  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const profilePayload = {
      bodyText: values.bodyText,
      videoTitle: values.videoTitle || null,
      videoHref: values.videoHref || null,
      socialLinks: {
        twitter:
          (values.socialTwitter || "") === (content.socialLinks.twitter ?? "")
            ? undefined
            : values.socialTwitter || null,
        facebook:
          (values.socialFacebook || "") === (content.socialLinks.facebook ?? "")
            ? undefined
            : values.socialFacebook || null,
        instagram:
          (values.socialInstagram || "") ===
          (content.socialLinks.instagram ?? "")
            ? undefined
            : values.socialInstagram || null,
        youtube:
          (values.socialYoutube || "") === (content.socialLinks.youtube ?? "")
            ? undefined
            : values.socialYoutube || null,
        linkedin:
          (values.socialLinkedin || "") === (content.socialLinks.linkedin ?? "")
            ? undefined
            : values.socialLinkedin || null,
      },
      facts: parseFactsText(String(values.facts ?? "")),
    };
    const interestsPayload = {
      interestIds: Array.isArray(values.interestIds) ? values.interestIds : [],
    };

    try {
      await Promise.all([
        httpClient.patch(
          `/admin/companies/${content.companyId}/profile`,
          profilePayload
        ),
        httpClient.patch(
          `/admin/companies/${content.companyId}/interests`,
          interestsPayload
        ),
      ]);
      toast.success(t("Conteúdo da empresa atualizado."));
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof HttpClientError
          ? error.message
          : t("Não foi possível guardar o conteúdo da empresa.")
      );
    }
  };

  return (
    <AdminForm
      cancelHref="/companies"
      id={content.companyId}
      submitLabels={{ create: t("Guardar"), edit: t("Guardar") }}
      sections={[
        {
          kind: "fields",
          title: t("Perfil (página interna)"),
          fields: [
            {
              kind: "textarea",
              name: "bodyText",
              label: t(
                "Sobre a empresa (deixe um parágrafo em branco entre parágrafos). Vazio = sem página interna."
              ),
              rows: 10,
            },
            { kind: "text", name: "videoTitle", label: t("Título do vídeo") },
            { kind: "video", name: "videoHref", label: t("Vídeo promocional") },
            { kind: "text", name: "socialTwitter", label: "Twitter" },
            { kind: "text", name: "socialFacebook", label: "Facebook" },
            { kind: "text", name: "socialInstagram", label: "Instagram" },
            { kind: "text", name: "socialYoutube", label: "YouTube" },
            { kind: "text", name: "socialLinkedin", label: "LinkedIn" },
            {
              kind: "textarea",
              name: "facts",
              label: t(
                'Factos - uma linha por facto, formato "Ícone|Descrição". Ícones disponíveis: {value}.',
                { value: FACT_ICON_NAMES.join(", ") }
              ),
              rows: 6,
            },
          ],
        },
        {
          kind: "fields",
          title: t("Interesses"),
          fields: [
            {
              kind: "multiSelect",
              name: "interestIds",
              label: t("Interesses"),
              options: interestOptions.map((interest) => ({
                label: interest.name,
                value: interest.id,
              })),
            },
          ],
        },
      ]}
      defaultValues={{
        bodyText: content.bodyText,
        videoTitle: content.videoTitle ?? "",
        videoHref: content.videoHref ?? "",
        socialTwitter: content.socialLinks.twitter ?? "",
        socialFacebook: content.socialLinks.facebook ?? "",
        socialInstagram: content.socialLinks.instagram ?? "",
        socialYoutube: content.socialLinks.youtube ?? "",
        socialLinkedin: content.socialLinks.linkedin ?? "",
        facts: factsToText(content.facts),
        interestIds: content.interestIds,
      }}
      onSubmit={handleSubmit}
    />
  );
};

export default CompanyContentForm;

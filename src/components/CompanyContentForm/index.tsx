"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { httpClient, HttpClientError } from "@/lib/http/client";
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
  logoWidth: number | null;
  logoHeight: number | null;
  className: string | null;
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
  const router = useRouter();

  const handleSubmit = async (values: Record<string, AdminFormValue>) => {
    const profilePayload = {
      bodyText: values.bodyText,
      videoTitle: values.videoTitle || null,
      videoHref: values.videoHref || null,
      socialLinks: {
        twitter: values.socialTwitter || undefined,
        facebook: values.socialFacebook || undefined,
        instagram: values.socialInstagram || undefined,
        youtube: values.socialYoutube || undefined,
        linkedin: values.socialLinkedin || undefined,
      },
      facts: parseFactsText(String(values.facts ?? "")),
    };
    const displayStylePayload = {
      logoWidth: values.logoWidth ? Number(values.logoWidth) : null,
      logoHeight: values.logoHeight ? Number(values.logoHeight) : null,
      className: values.className || null,
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
          `/admin/companies/${content.companyId}/display-style`,
          displayStylePayload
        ),
        httpClient.patch(
          `/admin/companies/${content.companyId}/interests`,
          interestsPayload
        ),
      ]);
      toast.success("Conteúdo da empresa atualizado.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof HttpClientError
          ? error.message
          : "Não foi possível guardar o conteúdo da empresa."
      );
    }
  };

  return (
    <AdminForm
      id={content.companyId}
      submitLabels={{ create: "Guardar", edit: "Guardar" }}
      sections={[
        {
          kind: "fields",
          title: "Perfil (página interna)",
          fields: [
            {
              kind: "textarea",
              name: "bodyText",
              label:
                "Sobre a empresa (deixe um parágrafo em branco entre parágrafos). Vazio = sem página interna.",
              rows: 10,
            },
            { kind: "text", name: "videoTitle", label: "Título do vídeo" },
            { kind: "text", name: "videoHref", label: "URL de embed do vídeo" },
            { kind: "text", name: "socialTwitter", label: "Twitter" },
            { kind: "text", name: "socialFacebook", label: "Facebook" },
            { kind: "text", name: "socialInstagram", label: "Instagram" },
            { kind: "text", name: "socialYoutube", label: "YouTube" },
            { kind: "text", name: "socialLinkedin", label: "LinkedIn" },
            {
              kind: "textarea",
              name: "facts",
              label: `Factos - uma linha por facto, formato "Ícone|Descrição". Ícones disponíveis: ${FACT_ICON_NAMES.join(", ")}.`,
              rows: 6,
            },
          ],
        },
        {
          kind: "fields",
          title: "Logótipo",
          fields: [
            { kind: "number", name: "logoWidth", label: "Largura" },
            { kind: "number", name: "logoHeight", label: "Altura" },
            { kind: "text", name: "className", label: "Classe CSS" },
          ],
        },
        {
          kind: "fields",
          title: "Interesses",
          fields: [
            {
              kind: "multiSelect",
              name: "interestIds",
              label: "Interesses",
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
        logoWidth: content.logoWidth ?? "",
        logoHeight: content.logoHeight ?? "",
        className: content.className ?? "",
        interestIds: content.interestIds,
      }}
      onSubmit={handleSubmit}
    />
  );
};

export default CompanyContentForm;

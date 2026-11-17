import ActionForm from "@/components/ActionForm";
import { getCompanies } from "@/application/services/companyService";
import { getUiText } from "@/application/services/uiLanguageService";

const NewActionPage = async () => {
  const t = await getUiText();

  const companies = await getCompanies();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">
        {t("Adicionar ação")}
      </h1>
      <ActionForm companies={companies} />
    </section>
  );
};

export default NewActionPage;

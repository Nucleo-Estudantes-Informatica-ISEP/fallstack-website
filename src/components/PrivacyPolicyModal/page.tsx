import { useEffect } from "react";
import Image from "next/image";

interface PrivacyPolicyModalProps {
  isVisible: boolean;
  setIsVisible: (value: boolean) => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isVisible,
  setIsVisible,
}) => {
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsVisible(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [setIsVisible]);

  if (isVisible)
    return (
      <div className="fixed left-0 top-0 z-30 flex h-full min-h-screen w-screen items-center justify-center bg-black/80">
        <div
          className="absolute left-0 top-0 z-0 h-screen w-screen"
          onClick={() => setIsVisible(false)}
        ></div>
        <section className="relative my-24 h-full w-5/6 overflow-y-scroll bg-background px-0 py-0">
          <button
            className="absolute right-4 top-4 z-10 text-2xl font-bold text-primary"
            onClick={() => setIsVisible(false)}
          >
            X
          </button>

          <div className="relative mb-12 w-full mt-12">
            <Image
              src="/assets/images/hero_privacy_policy.png"
              width={1920}
              height={400}
              alt=""
              className="w-full h-auto"
            />
            
          </div>

          <div className="px-8 pb-24 md:px-24">
            <button
              onClick={() => setIsVisible(false)}
              className="mb-8 font-sans text-sm font-normal text-white/35"
            >
              ← Voltar
            </button>

            <h1 className="text-center font-sans text-4xl font-semibold">
              Política de Privacidade – Fallstack
            </h1>

          <article className="mt-12">
            <h2 className="font-sans text-2xl font-semibold">
              Aplicação do Regulamento Geral sobre a Proteção de Dados
            </h2>
            <p className="mt-2 font-sans font-normal">Em vigor a partir de 16 de novembro de 2023.</p>
            <p className="mt-2 font-sans font-normal">
              O Núcleo de Estudantes de Informática do Instituto Superior de
              Engenharia do Porto (NEI- ISEP), em conformidade com o Regulamento
              Geral sobre a Proteção de Dados (RGPD), apresenta a sua Política
              de Privacidade para a aplicação Fallstack. Esta aplicação visa
              facilitar a participação dos estudantes no evento organizado pelo
              NEI-ISEP, proporcionando a criação de contas e a partilha de
              informações relevantes para o ambiente profissional.
            </p>
          </article>

          <article className="mt-12">
            <h2 className="font-sans text-2xl font-semibold">
              Responsável pelo tratamento
            </h2>
            <p className="mt-2 font-sans font-normal">
              O NEI-ISEP é a entidade responsável pelo tratamento dos dados
              pessoais dos utilizadores. Qualquer questão relacionada com a
              privacidade pode ser endereçada através do email{" "}
              <a
                href="mailto:info@nei-isep.org"
                className="text-primary underline"
              >
                info@nei-isep.org
              </a>
              .
            </p>
          </article>

          <article className="mt-12">
            <h2 className="font-sans text-2xl font-semibold">
              Recolha de Informações e Finalidade da Recolha
            </h2>
            <p className="mt-2 font-sans font-normal">
              Para utilizar a aplicação Fallstack, é necessário criar uma conta
              de utilizador.
            </p>
            <p className="mt-2 font-sans font-normal">
              O Núcleo de Estudantes de Informática do Instituto Superior de
              Engenharia do Porto (NEI- ISEP), em conformidade com o Regulamento
              Geral sobre a Proteção de Dados (RGPD), apresenta a sua Política
              de Privacidade para a aplicação Fallstack. Esta aplicação visa
              facilitar a participação dos estudantes no evento organizado pelo
              NEI-ISEP, proporcionando a criação de contas e a partilha de
              informações relevantes para o ambiente profissional. As
              informações solicitadas, como nome, email, palavra-passe,
              interesses, imagem de perfil, Curriculum Vitae (CV), perfil do
              LinkedIn e GitHub, são estritamente necessárias para autenticação,
              identificação e aprimoramento da interação dos utilizadores com as
              empresas participantes no evento. Esta prática está alinhada com
              as disposições legais do Regulamento Geral sobre a Proteção de
              Dados (RGPD).
            </p>
          </article>

          <article className="mt-12">
            <h2 className="font-sans text-2xl font-semibold">
              Base Legal para o Tratamento de Dados
            </h2>
            <p className="mt-2 font-sans font-normal">
              Ao criar uma conta na aplicação Fallstack, o utilizador consente
              explicitamente o tratamento dos seus dados para a participação no
              evento e interação com as empresas, estando esta ação fundamentada
              no consentimento do utilizador.
            </p>
          </article>

          <article className="mt-12">
            <h2 className="font-sans text-2xl font-semibold">
              Direitos dos Titulares dos Dados
            </h2>
            <p className="mt-2 font-sans font-normal">
              Os utilizadores têm o direito de aceder aos seus dados (Artigo 15°
              do RGPD), retificar as informações (Artigo 16° do RGPD), efetuar a
              portabilidade, apagar os dados (Artigo 17° do RGPD), e limitar ou
              opor-se a determinados tratamentos. Em caso de dúvidas ou para
              exercer estes direitos, os utilizadores podem contactar o
              Encarregado da Proteção de Dados através do email{" "}
              <a
                href="mailto:info@nei-isep.org"
                className="text-primary underline"
              >
                info@nei-isep.org
              </a>{" "}
              ou apresentar uma reclamação junto da CNPD - Comissão Nacional de
              Proteção de Dados (
              <a href="mailto:geral@cnpd.pt" className="text-primary underline">
                geral@cnpd.pt
              </a>
              ).
            </p>
          </article>

          <article className="mt-12">
            <h2 className="font-sans text-2xl font-semibold">
              Conservação das Informações
            </h2>
            <p className="mt-2 font-sans font-normal">
              Para eliminar uma conta, os utilizadores devem contactar o
              NEI-ISEP (
              <a
                href="mailto:info@nei-isep.org"
                className="text-primary underline"
              >
                info@nei-isep.org
              </a>
              ). Este reserva-se no direito de manter as informações necessárias
              para fins administrativos, mas os CVs, perfis de LinkedIn e GitHub
              serão removidos e não poderão ser recuperados.
            </p>
          </article>

          <article className="mt-12">
            <h2 className="font-sans text-2xl font-semibold">Partilha de Informações</h2>
            <p className="mt-2 font-sans font-normal">
              Ao criar uma conta na aplicação Fallstack, os utilizadores
              concordam que os seus CVs e perfis de LinkedIn e GitHub, bem como
              todas as suas informações de perfil, podem ser partilhadas com
              empresas participantes no evento Fallstack. Esta partilha tem como
              objetivo facilitar oportunidades de emprego e networking.
            </p>
          </article>

          <article className="mt-12">
            <h2 className="font-sans text-2xl font-semibold">
              Privacidade por Design e Segurança
            </h2>
            <p className="mt-2 font-sans font-normal">
              A aplicação Fallstack foi desenvolvida seguindo os princípios de
              privacidade por design, incorporando medidas de segurança
              robustas, incluindo encriptação, para garantir a proteção adequada
              dos dados pessoais dos utilizadores.
            </p>
          </article>

          <article className="mt-12">
            <h2 className="font-sans text-2xl font-semibold">
              Transferência Internacional de Dados
            </h2>
            <p className="mt-2 font-sans font-normal">
              Caso haja a necessidade de transferir dados para fora da União
              Europeia, serão implementadas medidas adequadas, como Cláusulas
              Contratuais Tipo, para assegurar a conformidade com as leis de
              proteção de dados.
            </p>
          </article>

          <article className="mt-12">
            <h2 className="font-sans text-2xl font-semibold">
              Notificação de Alterações na Política de Privacidade
            </h2>
            <p className="mt-2 font-sans font-normal">
              Os utilizadores serão notificados em caso de alterações na
              Política de Privacidade, e estas serão comunicadas de forma clara
              na aplicação.
            </p>
          </article>

          <article className="mt-12">
            <h2 className="font-sans text-2xl font-semibold">Obrigações do Utilizador</h2>
            <p className="mt-2 font-sans font-normal">
              Ao criar uma conta na aplicação Fallstack, o utilizador declara
              ter lido e concordado com esta Política de Privacidade em sua
              totalidade.
            </p>
          </article>

          <article className="mt-12">
            <h2 className="font-sans text-2xl font-semibold">Outros Termos</h2>
            <p className="mt-2 font-sans font-normal">
              Os dados pessoais dos utilizadores poderão ser partilhados com
              entidades públicas ou autoridades judiciais, se tal for
              obrigatório por lei ou para prevenir ou punir a prática de crimes.
            </p>
          </article>
          </div>
        </section>
      </div>
    );
};

export default PrivacyPolicyModal;

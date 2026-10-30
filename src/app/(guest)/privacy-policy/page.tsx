import Image from "next/image";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section
        className="relative flex h-75 w-full items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: "url('/icons/header-privacy-policy-background.png')",
        }}
      >
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10">
          <Image
            src="/favicon.ico"
            alt="Fall Stack Logo"
            width={128}
            height={128}
            priority
          />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pt-12 pb-24">
        <Link
          href="/"
          className="text-lg font-semibold text-white hover:text-gray-300"
        >
          ← Voltar
        </Link>

        <h1 className="mt-8 text-4xl font-bold md:text-5xl">
          Política de privacidade
        </h1>

        <article className="mt-12">
          <h2 className="text-2xl font-semibold">
            Aplicação do Regulamento Geral sobre a Proteção de Dados
          </h2>
          <p className="mt-4">Em vigor a partir de 30 de outubro de 2026.</p>
          <p className="mt-4">
            O Núcleo de Estudantes de Informática do Instituto Superior de
            Engenharia do Porto (NEI- ISEP), em conformidade com o Regulamento
            Geral sobre a Proteção de Dados (RGPD), apresenta a sua Política de
            Privacidade para a aplicação Fallstack. Esta aplicação visa
            facilitar a participação dos estudantes no evento organizado pelo
            NEI-ISEP, proporcionando a criação de contas e a partilha de
            informações relevantes para o ambiente profissional.
          </p>
        </article>

        <article className="mt-12">
          <h2 className="text-2xl font-semibold">
            Responsável pelo tratamento
          </h2>
          <p className="mt-4">
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
          <h2 className="text-2xl font-semibold">
            Recolha de Informações e Finalidade da Recolha
          </h2>
          <p className="mt-4">
            Para utilizar a aplicação Fallstack, é necessário criar uma conta de
            utilizador.
          </p>
          <p className="mt-4">
            O Núcleo de Estudantes de Informática do Instituto Superior de
            Engenharia do Porto (NEI- ISEP), em conformidade com o Regulamento
            Geral sobre a Proteção de Dados (RGPD), apresenta a sua Política de
            Privacidade para a aplicação Fallstack. Esta aplicação visa
            facilitar a participação dos estudantes no evento organizado pelo
            NEI-ISEP, proporcionando a criação de contas e a partilha de
            informações relevantes para o ambiente profissional. As informações
            solicitadas, como nome, email, palavra-passe, interesses, imagem de
            perfil, Curriculum Vitae (CV), perfil do LinkedIn e GitHub, são
            estritamente necessárias para autenticação, identificação e
            aprimoramento da interação dos utilizadores com as empresas
            participantes no evento. Esta prática está alinhada com as
            disposições legais do Regulamento Geral sobre a Proteção de Dados
            (RGPD).
          </p>
          <p className="mt-4">
            Quando o utilizador comparece no evento, o NEI-ISEP regista ainda a
            sua presença. Para isso são recolhidos o número de estudante, a
            data, a sessão, a hora do registo de presença (check-in) e o membro
            do NEI-ISEP que o efetuou. Estes dados são tratados para justificar
            as faltas do utilizador às aulas junto do Departamento de Engenharia
            Informática do ISEP.
          </p>
        </article>

        <article className="mt-12">
          <h2 className="text-2xl font-semibold">
            Base Legal para o Tratamento de Dados
          </h2>
          <p className="mt-4">
            Ao criar uma conta na aplicação Fallstack, o utilizador consente
            explicitamente o tratamento dos seus dados para a participação no
            evento e interação com as empresas, estando esta ação fundamentada
            no consentimento do utilizador. O registo de presença só é efetuado
            se o utilizador comparecer no evento e baseia-se igualmente no seu
            consentimento.
          </p>
        </article>

        <article className="mt-12">
          <h2 className="text-2xl font-semibold">
            Direitos dos Titulares dos Dados
          </h2>
          <p className="mt-4">
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
          <h2 className="text-2xl font-semibold">
            Conservação das Informações
          </h2>
          <p className="mt-4">
            Para eliminar uma conta, os utilizadores devem contactar o NEI-ISEP
            (
            <a
              href="mailto:info@nei-isep.org"
              className="text-primary underline"
            >
              info@nei-isep.org
            </a>
            ). Este reserva-se no direito de manter as informações necessárias
            para fins administrativos, mas os CVs, perfis de LinkedIn e GitHub
            serão removidos e não poderão ser recuperados. Os CVs são ainda
            removidos por um processo automático de limpeza, executado
            diariamente, depois de decorridos seis meses desde o seu
            carregamento; a eliminação efetiva pode ocorrer algum tempo depois
            desse prazo.
          </p>
          <p className="mt-4">
            Os registos de presença são conservados apenas até serem entregues e
            rececionados pelo Departamento de Engenharia Informática do ISEP.
            Após a receção, são eliminados no prazo máximo de uma semana.
          </p>
        </article>

        <article className="mt-12">
          <h2 className="text-2xl font-semibold">Partilha de Informações</h2>
          <p className="mt-4">
            Ao criar uma conta na aplicação Fallstack, os utilizadores concordam
            que os seus CVs e perfis de LinkedIn e GitHub, bem como todas as
            suas informações de perfil, podem ser partilhadas com empresas
            participantes no evento Fallstack. Esta partilha tem como objetivo
            facilitar oportunidades de emprego e networking.
          </p>
          <p className="mt-4">
            Os registos de presença (nome, email, número de estudante, data,
            sessão e hora do registo) são partilhados com o Departamento de
            Engenharia Informática do ISEP, através de um ficheiro Excel
            exportado da aplicação, para efeitos de justificação de faltas.
          </p>
        </article>

        <article className="mt-12">
          <h2 className="text-2xl font-semibold">
            Privacidade por Design e Segurança
          </h2>
          <p className="mt-4">
            A aplicação Fallstack foi desenvolvida seguindo os princípios de
            privacidade por design, incorporando medidas de segurança robustas,
            incluindo encriptação, para garantir a proteção adequada dos dados
            pessoais dos utilizadores.
          </p>
        </article>

        <article className="mt-12">
          <h2 className="text-2xl font-semibold">
            Transferência Internacional de Dados
          </h2>
          <p className="mt-4">
            Caso haja a necessidade de transferir dados para fora da União
            Europeia, serão implementadas medidas adequadas, como Cláusulas
            Contratuais Tipo, para assegurar a conformidade com as leis de
            proteção de dados.
          </p>
        </article>

        <article className="mt-12">
          <h2 className="text-2xl font-semibold">
            Notificação de Alterações na Política de Privacidade
          </h2>
          <p className="mt-4">
            Os utilizadores serão notificados em caso de alterações na Política
            de Privacidade, e estas serão comunicadas de forma clara na
            aplicação. Quando a alteração o exigir, será pedido aos utilizadores
            que aceitem novamente a Política de Privacidade para continuarem a
            utilizar a aplicação.
          </p>
        </article>

        <article className="mt-12">
          <h2 className="text-2xl font-semibold">Obrigações do Utilizador</h2>
          <p className="mt-4">
            Ao criar uma conta na aplicação Fallstack, o utilizador declara ter
            lido e concordado com esta Política de Privacidade em sua
            totalidade.
          </p>
        </article>

        <article className="mt-12">
          <h2 className="text-2xl font-semibold">Outros Termos</h2>
          <p className="mt-4">
            Os dados pessoais dos utilizadores poderão ser partilhados com
            entidades públicas ou autoridades judiciais, se tal for obrigatório
            por lei ou para prevenir ou punir a prática de crimes.
          </p>
        </article>
      </section>
    </main>
  );
}

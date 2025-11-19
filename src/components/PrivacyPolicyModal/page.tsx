import { useEffect } from "react";

interface PrivacyPolicyModalProps {
  isVisible: boolean;
  setIsVisible: (value: boolean) => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isVisible,
  setIsVisible,
}) => {
  
  // Fechar com a tecla ESC
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsVisible(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [setIsVisible]);

  if (!isVisible) return null;

  return (
    // 1. Overlay Fundo Preto (Cobre o ecrã todo)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 md:p-4">
      
      {/* Área clicável para fechar (clicar fora) */}
      <div
        className="absolute inset-0"
        onClick={() => setIsVisible(false)}
      ></div>

      {/* 2. Janela do Modal (Simula o <main> da sua página) */}
      <section className="relative z-10 flex h-full w-full md:max-w-5xl md:max-h-[90vh] flex-col overflow-hidden bg-black text-white shadow-2xl md:rounded-xl border border-white/10 antialiased">
        
        {/* Área de Scroll interna */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-black">
          
          {/* --- HEADER (Exatamente igual ao seu código: 300px de altura) --- */}
          <div
            className="relative flex h-[300px] w-full shrink-0 items-center justify-center bg-cover bg-center"
            style={{ 
              backgroundImage: "url('/icons/header-privacy-policy-background.png')" 
            }}
          >
            {/* Overlay preto a 30% */}
            <div className="absolute inset-0 bg-black/30" />
            
            {/* Logo Centrado */}
            <div className="relative z-10">
              <img
                src="/favicon.ico"
                alt="Fall Stack Logo"
                className="h-32 w-32 object-contain" // Ajuste visual para equivaler ao width={128} height={128} do Next/Image
              />
            </div>
          </div>

          {/* --- CONTEÚDO (Mantido igual ao seu código) --- */}
          <div className="mx-auto max-w-4xl px-6 pb-24 pt-12">
            
            {/* Botão Voltar (Substitui o Link) */}
            <button
              onClick={() => setIsVisible(false)}
              className="text-lg font-semibold text-white hover:text-gray-300 transition-colors"
            >
              ← Voltar
            </button>

            <h1 className="mt-8 text-4xl font-bold md:text-5xl">
              Política de privacidade
            </h1>

            {/* Artigo 1 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold">
                Aplicação do Regulamento Geral sobre a Proteção de Dados
              </h2>
              <p className="mt-4">Em vigor a partir de 16 de novembro de 2023.</p>
              <p className="mt-4 text-gray-300">
                O Núcleo de Estudantes de Informática do Instituto Superior de
                Engenharia do Porto (NEI- ISEP), em conformidade com o Regulamento
                Geral sobre a Proteção de Dados (RGPD), apresenta a sua Política
                de Privacidade para a aplicação Fallstack. Esta aplicação visa
                facilitar a participação dos estudantes no evento organizado pelo
                NEI-ISEP, proporcionando a criação de contas e a partilha de
                informações relevantes para o ambiente profissional.
              </p>
            </article>

            {/* Artigo 2 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold">
                Responsável pelo tratamento
              </h2>
              <p className="mt-4 text-gray-300">
                O NEI-ISEP é a entidade responsável pelo tratamento dos dados
                pessoais dos utilizadores. Qualquer questão relacionada com a
                privacidade pode ser endereçada através do email{" "}
                <a
                  href="mailto:info@nei-isep.org"
                  className="text-primary underline hover:text-white"
                >
                  info@nei-isep.org
                </a>
                .
              </p>
            </article>

            {/* Artigo 3 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold">
                Recolha de Informações e Finalidade da Recolha
              </h2>
              <p className="mt-4 text-gray-300">
                Para utilizar a aplicação Fallstack, é necessário criar uma conta
                de utilizador.
              </p>
              <p className="mt-4 text-gray-300">
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

            {/* Artigo 4 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold">
                Base Legal para o Tratamento de Dados
              </h2>
              <p className="mt-4 text-gray-300">
                Ao criar uma conta na aplicação Fallstack, o utilizador consente
                explicitamente o tratamento dos seus dados para a participação no
                evento e interação com as empresas, estando esta ação fundamentada
                no consentimento do utilizador.
              </p>
            </article>

            {/* Artigo 5 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold">
                Direitos dos Titulares dos Dados
              </h2>
              <p className="mt-4 text-gray-300">
                Os utilizadores têm o direito de aceder aos seus dados (Artigo 15°
                do RGPD), retificar as informações (Artigo 16° do RGPD), efetuar a
                portabilidade, apagar os dados (Artigo 17° do RGPD), e limitar ou
                opor-se a determinados tratamentos. Em caso de dúvidas ou para
                exercer estes direitos, os utilizadores podem contactar o
                Encarregado da Proteção de Dados através do email{" "}
                <a
                  href="mailto:info@nei-isep.org"
                  className="text-primary underline hover:text-white"
                >
                  info@nei-isep.org
                </a>{" "}
                ou apresentar uma reclamação junto da CNPD - Comissão Nacional de
                Proteção de Dados (
                <a href="mailto:geral@cnpd.pt" className="text-primary underline hover:text-white">
                  geral@cnpd.pt
                </a>
                ).
              </p>
            </article>

            {/* Artigo 6 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold">
                Conservação das Informações
              </h2>
              <p className="mt-4 text-gray-300">
                Para eliminar uma conta, os utilizadores devem contactar o
                NEI-ISEP (
                <a
                  href="mailto:info@nei-isep.org"
                  className="text-primary underline hover:text-white"
                >
                  info@nei-isep.org
                </a>
                ). Este reserva-se no direito de manter as informações necessárias
                para fins administrativos, mas os CVs, perfis de LinkedIn e GitHub
                serão removidos e não poderão ser recuperados.
              </p>
            </article>

            {/* Artigo 7 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold">Partilha de Informações</h2>
              <p className="mt-4 text-gray-300">
                Ao criar uma conta na aplicação Fallstack, os utilizadores
                concordam que os seus CVs e perfis de LinkedIn e GitHub, bem como
                todas as suas informações de perfil, podem ser partilhadas com
                empresas participantes no evento Fallstack. Esta partilha tem como
                objetivo facilitar oportunidades de emprego e networking.
              </p>
            </article>

            {/* Artigo 8 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold">
                Privacidade por Design e Segurança
              </h2>
              <p className="mt-4 text-gray-300">
                A aplicação Fallstack foi desenvolvida seguindo os princípios de
                privacidade por design, incorporando medidas de segurança
                robustas, incluindo encriptação, para garantir a proteção adequada
                dos dados pessoais dos utilizadores.
              </p>
            </article>

            {/* Artigo 9 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold">
                Transferência Internacional de Dados
              </h2>
              <p className="mt-4 text-gray-300">
                Caso haja a necessidade de transferir dados para fora da União
                Europeia, serão implementadas medidas adequadas, como Cláusulas
                Contratuais Tipo, para assegurar a conformidade com as leis de
                proteção de dados.
              </p>
            </article>

            {/* Artigo 10 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold">
                Notificação de Alterações na Política de Privacidade
              </h2>
              <p className="mt-4 text-gray-300">
                Os utilizadores serão notificados em caso de alterações na
                Política de Privacidade, e estas serão comunicadas de forma clara
                na aplicação.
              </p>
            </article>

            {/* Artigo 11 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold">Obrigações do Utilizador</h2>
              <p className="mt-4 text-gray-300">
                Ao criar uma conta na aplicação Fallstack, o utilizador declara
                ter lido e concordado com esta Política de Privacidade em sua
                totalidade.
              </p>
            </article>

            {/* Artigo 12 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold">Outros Termos</h2>
              <p className="mt-4 text-gray-300">
                Os dados pessoais dos utilizadores poderão ser partilhados com
                entidades públicas ou autoridades judiciais, se tal for
                obrigatório por lei ou para prevenir ou punir a prática de crimes.
              </p>
            </article>

          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicyModal;
"use client";

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

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 md:p-4">
      
      <div
        className="absolute inset-0"
        onClick={() => setIsVisible(false)}
      ></div>

      <section className="relative z-10 flex h-full w-full md:max-w-5xl md:max-h-[90vh] flex-col overflow-hidden bg-black text-white shadow-2xl md:rounded-xl border border-white/10 antialiased">
        
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-black">
          
          <div className="relative flex h-[300px] w-full shrink-0 items-center justify-center bg-gray-900">
            
            <div className="absolute inset-0 z-0 flex items-center justify-center">
              <Image
                src="/icons/header-privacy-policy-background.png"
                alt="Background Texture"
                fill 
                priority
                quality={100}
                className="object-contain scale-125 md:scale-100 lg:scale-90 opacity-60" 
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              />
            </div>

            <div className="absolute inset-0 z-10 bg-black/50" /> 
            
            <div className="absolute inset-x-0 bottom-0 h-24 z-10 bg-gradient-to-t from-black to-transparent" />

            <div className="relative z-20">
              <Image
                src="/favicon.ico"
                alt="Fall Stack Logo"
                width={128}
                height={128}
                priority
                className="drop-shadow-2xl"
              />
            </div>
          </div>

          {/* --- CONTEÚDO --- */}
          <div className="mx-auto max-w-4xl px-6 pb-24 pt-12">
            
            <button
              onClick={() => setIsVisible(false)}
              className="text-lg font-semibold text-white hover:text-gray-300 transition-colors mb-8 inline-flex items-center gap-2"
            >
              <span>←</span> Voltar
            </button>

            <h1 className="text-4xl font-bold md:text-5xl text-white">
              Política de privacidade
            </h1>

            {/* Artigo 1 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold text-white">
                Aplicação do Regulamento Geral sobre a Proteção de Dados
              </h2>
              <p className="mt-4 text-gray-300">Em vigor a partir de 16 de novembro de 2023.</p>
              <p className="mt-4 text-gray-300 leading-relaxed">
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
              <h2 className="text-2xl font-semibold text-white">
                Responsável pelo tratamento
              </h2>
              <p className="mt-4 text-gray-300 leading-relaxed">
                O NEI-ISEP é a entidade responsável pelo tratamento dos dados
                pessoais dos utilizadores. Qualquer questão relacionada com a
                privacidade pode ser endereçada através do email{" "}
                <a
                  href="mailto:info@nei-isep.org"
                  className="text-primary underline hover:text-white transition-colors"
                >
                  info@nei-isep.org
                </a>
                .
              </p>
            </article>

            {/* Artigo 3 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold text-white">
                Recolha de Informações e Finalidade da Recolha
              </h2>
              <p className="mt-4 text-gray-300 leading-relaxed">
                Para utilizar a aplicação Fallstack, é necessário criar uma conta
                de utilizador.
              </p>
              <p className="mt-4 text-gray-300 leading-relaxed">
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
              <h2 className="text-2xl font-semibold text-white">
                Base Legal para o Tratamento de Dados
              </h2>
              <p className="mt-4 text-gray-300 leading-relaxed">
                Ao criar uma conta na aplicação Fallstack, o utilizador consente
                explicitamente o tratamento dos seus dados para a participação no
                evento e interação com as empresas, estando esta ação fundamentada
                no consentimento do utilizador.
              </p>
            </article>

            {/* Artigo 5 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold text-white">
                Direitos dos Titulares dos Dados
              </h2>
              <p className="mt-4 text-gray-300 leading-relaxed">
                Os utilizadores têm o direito de aceder aos seus dados (Artigo 15°
                do RGPD), retificar as informações (Artigo 16° do RGPD), efetuar a
                portabilidade, apagar os dados (Artigo 17° do RGPD), e limitar ou
                opor-se a determinados tratamentos. Em caso de dúvidas ou para
                exercer estes direitos, os utilizadores podem contactar o
                Encarregado da Proteção de Dados através do email{" "}
                <a
                  href="mailto:info@nei-isep.org"
                  className="text-primary underline hover:text-white transition-colors"
                >
                  info@nei-isep.org
                </a>{" "}
                ou apresentar uma reclamação junto da CNPD - Comissão Nacional de
                Proteção de Dados (
                <a href="mailto:geral@cnpd.pt" className="text-primary underline hover:text-white transition-colors">
                  geral@cnpd.pt
                </a>
                ).
              </p>
            </article>

            {/* Artigo 6 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold text-white">
                Conservação das Informações
              </h2>
              <p className="mt-4 text-gray-300 leading-relaxed">
                Para eliminar uma conta, os utilizadores devem contactar o
                NEI-ISEP (
                <a
                  href="mailto:info@nei-isep.org"
                  className="text-primary underline hover:text-white transition-colors"
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
              <h2 className="text-2xl font-semibold text-white">Partilha de Informações</h2>
              <p className="mt-4 text-gray-300 leading-relaxed">
                Ao criar uma conta na aplicação Fallstack, os utilizadores
                concordam que os seus CVs e perfis de LinkedIn e GitHub, bem como
                todas as suas informações de perfil, podem ser partilhadas com
                empresas participantes no evento Fallstack. Esta partilha tem como
                objetivo facilitar oportunidades de emprego e networking.
              </p>
            </article>

            {/* Artigo 8 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold text-white">
                Privacidade por Design e Segurança
              </h2>
              <p className="mt-4 text-gray-300 leading-relaxed">
                A aplicação Fallstack foi desenvolvida seguindo os princípios de
                privacidade por design, incorporando medidas de segurança
                robustas, incluindo encriptação, para garantir a proteção adequada
                dos dados pessoais dos utilizadores.
              </p>
            </article>

            {/* Artigo 9 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold text-white">
                Transferência Internacional de Dados
              </h2>
              <p className="mt-4 text-gray-300 leading-relaxed">
                Caso haja a necessidade de transferir dados para fora da União
                Europeia, serão implementadas medidas adequadas, como Cláusulas
                Contratuais Tipo, para assegurar a conformidade com as leis de
                proteção de dados.
              </p>
            </article>

            {/* Artigo 10 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold text-white">
                Notificação de Alterações na Política de Privacidade
              </h2>
              <p className="mt-4 text-gray-300 leading-relaxed">
                Os utilizadores serão notificados em caso de alterações na
                Política de Privacidade, e estas serão comunicadas de forma clara
                na aplicação.
              </p>
            </article>

            {/* Artigo 11 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold text-white">Obrigações do Utilizador</h2>
              <p className="mt-4 text-gray-300 leading-relaxed">
                Ao criar uma conta na aplicação Fallstack, o utilizador declara
                ter lido e concordado com esta Política de Privacidade em sua
                totalidade.
              </p>
            </article>

            {/* Artigo 12 */}
            <article className="mt-12">
              <h2 className="text-2xl font-semibold text-white">Outros Termos</h2>
              <p className="mt-4 text-gray-300 leading-relaxed">
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
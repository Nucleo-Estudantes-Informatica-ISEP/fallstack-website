import Link from "next/link";

import { TERMS_VERSION } from "@/domain/student/signupPolicy";

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12 text-white">
      <Link href="/signup" className="underline">
        Voltar ao registo
      </Link>
      <h1 className="mt-8 text-3xl font-bold">Termos de utilização</h1>
      <p className="mt-4">
        Versão {TERMS_VERSION}. Em vigor a partir de 11 de novembro de 2026.
      </p>
      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">A plataforma</h2>
        <p>
          O Núcleo de Estudantes de Informática do ISEP (NEI-ISEP) disponibiliza
          a Fallstack para apoiar a participação no evento e o contacto entre
          estudantes e empresas. Contacto:{" "}
          <a className="underline" href="mailto:info@nei-isep.org">
            info@nei-isep.org
          </a>
          .
        </p>
        <h2 className="text-xl font-semibold">
          Conta e utilização responsável
        </h2>
        <p>
          A autenticação é feita pelo AuthNEI. Mantém os teus dados corretos e
          protege o acesso à tua conta. Não te faças passar por outra pessoa,
          não partilhes tokens ou códigos pessoais, não carregues conteúdos
          ilícitos ou ficheiros maliciosos e não tentes aceder a contas, dados
          ou funcionalidades sem autorização.
        </p>
        <h2 className="text-xl font-semibold">Perfil e conteúdos</h2>
        <p>
          Carrega apenas conteúdos que tens direito a partilhar. O CV, a
          fotografia e os links profissionais são opcionais. Continuas titular
          dos teus conteúdos; a sua disponibilização autoriza apenas o uso
          necessário às funcionalidades da plataforma, nos termos da{" "}
          <Link className="underline" href="/privacy-policy">
            política de privacidade
          </Link>
          . A aceitação destes termos é distinta do consentimento relativo a
          dados pessoais.
        </p>
        <h2 className="text-xl font-semibold">Evento e disponibilidade</h2>
        <p>
          O programa e as funcionalidades podem ser atualizados. A participação
          e os pontos na plataforma não garantem ofertas de emprego, seleção por
          empresas ou prémios. Eventuais condições específicas de atividades ou
          prémios são comunicadas pela organização. Podem ocorrer interrupções
          para manutenção ou segurança.
        </p>
        <h2 className="text-xl font-semibold">Segurança e encerramento</h2>
        <p>
          O NEI-ISEP pode limitar acessos necessários para proteger a plataforma
          ou investigar utilização abusiva. Podes usar as opções disponíveis na
          conta ou contactar a organização para pedir apoio ou encerramento. O
          tratamento e a conservação dos dados seguem a política de privacidade
          e as obrigações aplicáveis.
        </p>
        <h2 className="text-xl font-semibold">Direitos e alterações</h2>
        <p>
          Estes termos não excluem direitos legalmente reconhecidos nem limitam
          responsabilidades que a lei não permita excluir. As alterações são
          publicadas com uma nova versão e data; não alteram retroativamente a
          aceitação registada. Para dúvidas ou reclamações, contacta a
          organização.
        </p>
      </section>
    </main>
  );
}

import { Archive, Chart, Leaf, Trophy } from "@/styles/Icons";

import { CompanyProps } from "../components/Companies/Company";
import { aprLogo, armisLogo, cloudflareLogo, hitachiLogo } from "./CompaniesImages";



 // parceiros diamond:
 /*
  APR - Technology Solutions
  ARMIS
  Cloudflare
  Hitachi Solutions
 */


export const DiamondCompanies: CompanyProps[] = [
  {
    logoHref: aprLogo,
    name: "APR - Technology Solutions",
    modalInformation: {
      title: "APR - Technology Solutions",
      bodyText: (        
        <p> 

          Somos uma empresa tecnológica com mais de 30 anos de experiência, 
          parceira da Microsoft, dedicada à inovação, desenvolvimento e implementação 
          de soluções que impulsionam o crescimento dos nossos clientes. 
          Com uma oferta diversificada e especializações em ERP Dynamics Business 
          Central, Systems, CRM Solutions e Microsoft Power Platform, 
          atuamos em múltiplos setores, liderando a transformação digital de organizações 
          em todo o mundo.

          A nossa presença reflete um compromisso global 
          com a excelência tecnológica, apoiando empresas na otimização de 
          processos, aumento da eficiência operacional e automação de 
          tarefas, sempre com foco na segurança digital.
          Mais do que implementar tecnologia, oferecemos consultoria 
          estratégica, suporte contínuo e desenvolvimento aplicacional 
          personalizado, ajustado às necessidades específicas de cada negócio. 
          A nossa metodologia centrada no cliente permite-nos 
          antecipar tendências, responder rapidamente às mudanças do 
          mercado e preparar as empresas para o futuro digital.
        </p>
      ),
      instagramLink: "https://www.instagram.com/aprtechnologysolutions/",
      linkedinLink: "https://www.linkedin.com/company/apr-technology-solutions/",
      facebookLink: "https://www.facebook.com/aprtechnologysolutions",
      youtubeLink: "https://www.youtube.com/@aprtechnologysolutions",
      website: "https://www.apr.pt",
      videoTitle: "Vídeo promocional",
      videoHref:
        "https://www.youtube.com/embed/QkeMa02JqD4?si=xNaIvpGCvDycJz4A",
      facts: [
        {
          iconSrc: Trophy,
          description:
            "Multinacional com a sua presença em 11 países diferentes",
        },
        {
          iconSrc: Archive,
          description: "+ 18 anos de história",
        },
        {
          iconSrc: Leaf,
          description: "Acolhimento de estagiários curriculares",
        },
      ],
    },
    className: "w-42",
    interests: ["AI", "Mobile", "Software Development", "Backend"],
  },
  {
    logoHref: armisLogo,
    name: "armis",
    modalInformation: {
      title: "Armis",
      bodyText: (
        <p>
          A ARMIS é um grupo tecnológico com mais de 19 anos de história,
          dedicado à inovação, desenvolvimento e implementação de soluções que
          potenciam o crescimento dos seus clientes. Com uma oferta
          diversificada com produtos inovadores e especializações em
          Cibersegurança, Inteligência Artificial, Business Intelligence,
          Enterprise Solutions e Data, atuamos nos setores mais desafiantes do
          mercado. A nossa presença global estende-se por localizações
          estratégicas no Porto, Lisboa, São Paulo, São José dos Campos, Miami,
          Nova Iorque e Dubai, sendo uma multinacional que realiza projetos
          internacionais em diversos países. O nosso lema, “Moving Business
          Through Technology”, reflete a nossa missão de dinamizar a evolução
          dos negócios através de soluções tecnológicas de ponta, com um
          compromisso contínuo em entregar projetos desafiantes com máxima
          qualidade e eficiência.
        </p>
      ),
      instagramLink: "https://www.instagram.com/armisgroup/",
      linkedinLink: "https://www.linkedin.com/company/armis/",
      facebookLink: "https://www.facebook.com/grupoarmis/",
      youtubeLink: "https://www.youtube.com/@armisgroup",
      website: "https://www.armis.pt",
      videoTitle: "Vídeo promocional",
      videoHref:
        "https://www.youtube.com/embed/QkeMa02JqD4?si=xNaIvpGCvDycJz4A",
      facts: [
        {
          iconSrc: Trophy,
          description:
            "Multinacional com a sua presença em 11 países diferentes",
        },
        {
          iconSrc: Archive,
          description: "+ 18 anos de história",
        },
        {
          iconSrc: Leaf,
          description: "Acolhimento de estagiários curriculares",
        },
      ],
    },
    className: "w-42",
    interests: ["AI", "Mobile", "Software Development", "Backend"],
  },{
    logoHref: cloudflareLogo,
    name: "Cloudflare",
    interests: ["Backend", "Cloud Computing", "Data Analysis"],
    modalInformation: {
      title: "Cloudflare",
      bodyText: (
        <>
          <p>
            Hitachi Solutions is a consulting company, Microsoft Solution
            Partner and system integrator specialising in innovative solutions
            for large organisations in the private and public sector. Hitachi
            Solutions has opportunities for graduates who are based in Portugal
            and have a keen interest in technology, plus a desire to pursue an
            international career in consulting.
          </p>
          <br />
          <p>
            Our office address is Avenida da Senhora da Hora 357, Matosinhos.
            Our website is Hitachi Solutions | Business Transformation
            Consultancy (hitachi-solutions.pt) and if you have any queries,
            please send an email to ioliveira@hitachisolutions.com .
          </p>
        </>
      ),
      instagramLink: "https://www.instagram.com/hitachisolutions.portugal/",
      linkedinLink:
        "https://www.linkedin.com/company/hitachi-solutions-portugal/",
      website: "https://hitachi-solutions.pt/",
      videoTitle: "Vídeo promocional",
      videoHref:
        "https://www.youtube.com/embed/I4RyT-u2aIw?si=aAfGMCR3zVnAaHJp",
      facts: [
        {
          iconSrc: Archive,
          description: "Empresa de consultoria global",
        },
        {
          iconSrc: Leaf,
          description: "Cultura diversificada e recompensadora",
        },
        {
          iconSrc: Chart,
          description:
            "Especializados em aplicações empresariais amigáveis baseadas na Microsoft cloud",
        },
      ],
    },
  },

  {
    logoHref: hitachiLogo,
    name: "hitachi",
    interests: ["Backend", "Cloud Computing", "Data Analysis"],
    className: "w-3/4",
    modalInformation: {
      title: "Hitachi Solutions",
      bodyText: (
        <>
          <p>
            Hitachi Solutions is a consulting company, Microsoft Solution
            Partner and system integrator specialising in innovative solutions
            for large organisations in the private and public sector. Hitachi
            Solutions has opportunities for graduates who are based in Portugal
            and have a keen interest in technology, plus a desire to pursue an
            international career in consulting.
          </p>
          <br />
          <p>
            Our office address is Avenida da Senhora da Hora 357, Matosinhos.
            Our website is Hitachi Solutions | Business Transformation
            Consultancy (hitachi-solutions.pt) and if you have any queries,
            please send an email to ioliveira@hitachisolutions.com .
          </p>
        </>
      ),
      instagramLink: "https://www.instagram.com/hitachisolutions.portugal/",
      linkedinLink:
        "https://www.linkedin.com/company/hitachi-solutions-portugal/",
      website: "https://hitachi-solutions.pt/",
      videoTitle: "Vídeo promocional",
      videoHref:
        "https://www.youtube.com/embed/I4RyT-u2aIw?si=aAfGMCR3zVnAaHJp",
      facts: [
        {
          iconSrc: Archive,
          description: "Empresa de consultoria global",
        },
        {
          iconSrc: Leaf,
          description: "Cultura diversificada e recompensadora",
        },
        {
          iconSrc: Chart,
          description:
            "Especializados em aplicações empresariais amigáveis baseadas na Microsoft cloud",
        },
      ],
    },
  },
];

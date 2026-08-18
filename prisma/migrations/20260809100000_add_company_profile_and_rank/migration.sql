-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "rankId" UUID;

-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "companyId" UUID;

-- CreateTable
CREATE TABLE "CompanyRank" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyRank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyRankStyle" (
    "id" UUID NOT NULL,
    "rankId" UUID NOT NULL,
    "gradientFromColor" TEXT NOT NULL,
    "gradientFromStop" TEXT NOT NULL,
    "gradientToColor" TEXT NOT NULL,
    "gradientToStop" TEXT NOT NULL,
    "hasInternalPage" BOOLEAN NOT NULL DEFAULT false,
    "showsPromoVideo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyRankStyle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "bodyText" TEXT NOT NULL,
    "videoTitle" TEXT,
    "videoHref" TEXT,
    "socialLinks" JSONB,
    "facts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyDisplayStyle" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "logoWidth" INTEGER,
    "logoHeight" INTEGER,
    "className" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyDisplayStyle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CompanyToInterest" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_CompanyToInterest_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyRank_name_key" ON "CompanyRank"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyRankStyle_rankId_key" ON "CompanyRankStyle"("rankId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_companyId_key" ON "CompanyProfile"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyDisplayStyle_companyId_key" ON "CompanyDisplayStyle"("companyId");

-- CreateIndex
CREATE INDEX "_CompanyToInterest_B_index" ON "_CompanyToInterest"("B");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "CompanyRank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRankStyle" ADD CONSTRAINT "CompanyRankStyle_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "CompanyRank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDisplayStyle" ADD CONSTRAINT "CompanyDisplayStyle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyToInterest" ADD CONSTRAINT "_CompanyToInterest_A_fkey" FOREIGN KEY ("A") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyToInterest" ADD CONSTRAINT "_CompanyToInterest_B_fkey" FOREIGN KEY ("B") REFERENCES "Interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill #280 part 1: seed CompanyRank + CompanyRankStyle from the fixed
-- Tier enum's current values. `tier`/Tier stay authoritative until
-- consumers cut over (see schema.prisma comments on Company.rankId) - this
-- just gives every existing tier a matching rank row to link to.
INSERT INTO "CompanyRank" ("id", "name", "order", "updatedAt")
VALUES
  (gen_random_uuid(), 'Diamond', 0, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Gold', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Silver', 2, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Bronze', 3, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "CompanyRankStyle"
  ("id", "rankId", "gradientFromColor", "gradientFromStop", "gradientToColor", "gradientToStop", "hasInternalPage", "showsPromoVideo", "updatedAt")
SELECT gen_random_uuid(), r."id", v."gradientFromColor", v."gradientFromStop", v."gradientToColor", v."gradientToStop", v."hasInternalPage", v."showsPromoVideo", CURRENT_TIMESTAMP
FROM (
  VALUES
    ('Diamond', '#000999', '13%', '#3284FF', '89%', true, true),
    ('Gold', '#FF9D00', '13%', '#8E8900', '89%', true, false),
    ('Silver', '#484848', '13%', '#FFFFFF', '89%', false, false),
    ('Bronze', '#692100', '13%', '#E98800', '89%', false, false)
) AS v("rankName", "gradientFromColor", "gradientFromStop", "gradientToColor", "gradientToStop", "hasInternalPage", "showsPromoVideo")
JOIN "CompanyRank" r ON r."name" = v."rankName"
ON CONFLICT ("rankId") DO NOTHING;

UPDATE "Company" c SET "rankId" = r."id"
FROM "CompanyRank" r
WHERE r."name" = 'Diamond' AND c."tier" = 'DIAMOND';

UPDATE "Company" c SET "rankId" = r."id"
FROM "CompanyRank" r
WHERE r."name" = 'Gold' AND c."tier" = 'GOLD';

UPDATE "Company" c SET "rankId" = r."id"
FROM "CompanyRank" r
WHERE r."name" = 'Silver' AND c."tier" = 'SILVER';

UPDATE "Company" c SET "rankId" = r."id"
FROM "CompanyRank" r
WHERE r."name" = 'Bronze' AND c."tier" = 'BRONZE';

-- Backfill #280 part 2: logo sizing for every company that had one in
-- src/edition/{Diamond,Gold,Silver,Bronze}Companies.{tsx,ts} (matched by
-- name, same case-insensitive-in-practice matching CompanyByName.ts did -
-- the values below use the exact Company.name rows already seeded by
-- prisma/migrations/20260714011113_company_display_fields).
INSERT INTO "CompanyDisplayStyle" ("id", "companyId", "logoWidth", "logoHeight", "className", "updatedAt")
SELECT gen_random_uuid(), c."id", v."logoWidth", v."logoHeight", v."className", CURRENT_TIMESTAMP
FROM (
  VALUES
    ('APR - Technology Solutions', 4215, 4215, 'w-42'),
    ('armis', 149, 149, NULL),
    ('Cloudflare', 250, 85, NULL),
    ('hitachi', 1279, 476, 'w-3/4'),
    ('CGI', 1202, 560, 'w-3/4'),
    ('deloitte', 1614, 656, NULL),
    ('Devscope', 1222, 232, NULL),
    ('Devoteam', 798, 332, 'w-3/4'),
    ('glintt', 4001, 2251, NULL),
    ('accenture', 1984, 524, 'w-3/4'),
    ('Cegid', 80, 33, NULL),
    ('Itim', 2682, 1870, 'w-2/4'),
    ('msg insur:it', 4096, 549, 'w-3/4'),
    ('Euronext', 1935, 600, NULL),
    ('Liderteam', 1920, 1080, 'w-3/4')
) AS v("name", "logoWidth", "logoHeight", "className")
JOIN "Company" c ON c."name" = v."name"
ON CONFLICT ("companyId") DO NOTHING;

-- Backfill #280 part 3: rich modal content for the 8 companies that had a
-- `modalInformation` block (Diamond + Gold only - Silver/Bronze never had
-- one). bodyText is converted from JSX to plain text, paragraphs joined by
-- a blank line; `website` is dropped from socialLinks since Company.website
-- already carries it (was one of the two unsynced copies #280 calls out).
INSERT INTO "CompanyProfile" ("id", "companyId", "bodyText", "videoTitle", "videoHref", "socialLinks", "facts", "updatedAt")
SELECT gen_random_uuid(), c."id", v."bodyText", v."videoTitle", v."videoHref", v."socialLinks"::jsonb, v."facts"::jsonb, CURRENT_TIMESTAMP
FROM (
  VALUES
    (
      'APR - Technology Solutions',
      'Somos uma empresa tecnológica com mais de 30 anos de experiência, parceira da Microsoft, dedicada à inovação, desenvolvimento e implementação de soluções que impulsionam o crescimento dos nossos clientes. Com uma oferta diversificada e especializações em ERP Dynamics Business Central, Systems, CRM Solutions e Microsoft Power Platform, atuamos em múltiplos setores, liderando a transformação digital de organizações em todo o mundo. A nossa presença reflete um compromisso global com a excelência tecnológica, apoiando empresas na otimização de processos, aumento da eficiência operacional e automação de tarefas, sempre com foco na segurança digital. Mais do que implementar tecnologia, oferecemos consultoria estratégica, suporte contínuo e desenvolvimento aplicacional personalizado, ajustado às necessidades específicas de cada negócio. A nossa metodologia centrada no cliente permite-nos antecipar tendências, responder rapidamente às mudanças do mercado e preparar as empresas para o futuro digital.',
      NULL,
      NULL,
      '{"instagram":"https://www.instagram.com/aprtechnologysolutions/","facebook":"https://www.facebook.com/aprtechnologysolutions","youtube":"https://www.youtube.com/@aprtechnologysolutions","linkedin":"https://www.linkedin.com/company/apr-technology-solutions/"}',
      '[{"iconName":"Trophy","description":"Multinacional com a sua presença em 11 países diferentes"},{"iconName":"Archive","description":"+ 18 anos de história"},{"iconName":"Leaf","description":"Acolhimento de estagiários curriculares"}]'
    ),
    (
      'armis',
      'A ARMIS é um grupo tecnológico com mais de 19 anos de história, dedicado à inovação, desenvolvimento e implementação de soluções que potenciam o crescimento dos seus clientes. Com uma oferta diversificada com produtos inovadores e especializações em Cibersegurança, Inteligência Artificial, Business Intelligence, Enterprise Solutions e Data, atuamos nos setores mais desafiantes do mercado. A nossa presença global estende-se por localizações estratégicas no Porto, Lisboa, São Paulo, São José dos Campos, Miami, Nova Iorque e Dubai, sendo uma multinacional que realiza projetos internacionais em diversos países. O nosso lema, "Moving Business Through Technology", reflete a nossa missão de dinamizar a evolução dos negócios através de soluções tecnológicas de ponta, com um compromisso contínuo em entregar projetos desafiantes com máxima qualidade e eficiência.',
      'Vídeo promocional',
      'https://www.youtube.com/embed/QkeMa02JqD4?si=xNaIvpGCvDycJz4A',
      '{"instagram":"https://www.instagram.com/armisgroup/","facebook":"https://www.facebook.com/grupoarmis/","youtube":"https://www.youtube.com/@armisgroup","linkedin":"https://www.linkedin.com/company/armis/"}',
      '[{"iconName":"Trophy","description":"Multinacional com a sua presença em 11 países diferentes"},{"iconName":"Archive","description":"+ 18 anos de história"},{"iconName":"Leaf","description":"Acolhimento de estagiários curriculares"}]'
    ),
    (
      'Cloudflare',
      'Cloudflare is on a mission to help build a better Internet. Today the company runs one of the world''s largest networks that powers millions of websites and other Internet properties for customers ranging from individual bloggers to SMBs to Fortune 500 companies. Cloudflare protects and accelerates any Internet application online without adding hardware, installing software, or changing a line of code.

Internet properties powered by Cloudflare all have web traffic routed through its intelligent global network, which gets smarter with every request. As a result, they see significant improvement in performance and a decrease in spam and other attacks. Cloudflare was named to Entrepreneur Magazine''s Top Company Cultures list and ranked among the World''s Most Innovative Companies by Fast Company.',
      NULL,
      NULL,
      '{"linkedin":"https://www.linkedin.com/company/cloudflare/"}',
      '[{"iconName":"Trophy","description":"One of the world''s largest networks"},{"iconName":"Archive","description":"Powers millions of websites globally"},{"iconName":"Leaf","description":"Named to Top Company Cultures list"}]'
    ),
    (
      'hitachi',
      'Hitachi Solutions is a consulting company, Microsoft Solution Partner and system integrator specialising in innovative solutions for large organisations in the private and public sector. Hitachi Solutions has opportunities for graduates who are based in Portugal and have a keen interest in technology, plus a desire to pursue an international career in consulting.

Our office address is Avenida da Senhora da Hora 357, Matosinhos. Our website is Hitachi Solutions | Business Transformation Consultancy (hitachi-solutions.pt) and if you have any queries, please send an email to ioliveira@hitachisolutions.com .',
      'Vídeo promocional',
      'https://www.youtube.com/embed/I4RyT-u2aIw?si=aAfGMCR3zVnAaHJp',
      '{"instagram":"https://www.instagram.com/hitachisolutions.portugal/","linkedin":"https://www.linkedin.com/company/hitachi-solutions-portugal/"}',
      '[{"iconName":"Archive","description":"Empresa de consultoria global"},{"iconName":"Leaf","description":"Cultura diversificada e recompensadora"},{"iconName":"Chart","description":"Especializados em aplicações empresariais amigáveis baseadas na Microsoft cloud"}]'
    ),
    (
      'CGI',
      'A CGI é uma das maiores empresas independentes de consultoria de tecnologia da informação e serviços de negócios do mundo. Fundada em 1976, temos uma presença global com profissionais em mais de 40 países, oferecendo soluções completas de TI e serviços de consultoria de negócios que ajudam os clientes a alcançar seus objetivos estratégicos.

Nossa abordagem combina proximidade com clientes, compromisso com resultados e uma profunda experiência em setores-chave. Trabalhamos como parceiros estratégicos, ajudando organizações a transformar digitalmente seus negócios, otimizar operações e impulsionar a inovação através de tecnologias emergentes como cloud, IA e cibersegurança.',
      NULL,
      NULL,
      '{"linkedin":"https://www.linkedin.com/company/cgi/","facebook":"https://www.facebook.com/cgiinc/"}',
      '[{"iconName":"Trophy","description":"Uma das maiores empresas de consultoria de TI do mundo"},{"iconName":"Archive","description":"Presença global em mais de 40 países"},{"iconName":"Trophy","description":"Mais de 90,000 profissionais em todo o mundo"},{"iconName":"Leaf","description":"Experiência em transformação digital e inovação"}]'
    ),
    (
      'deloitte',
      'You will never work alone

Acreditamos que o impacto que criamos se multiplica quando trabalhamos em equipa. Juntos podemos mudar o mundo - torná-lo mais humano, eficiente e tecnológico. Mas isso só é possível se conectarmos o teu talento ao de outras pessoas como tu.

Na Deloitte, nunca trabalharás sozinho. Vais integrar os mais variados e desafiantes projetos e fazer parte do nosso Global Solutions Center, onde poderás colaborar de forma integrada com outras equipas da rede global Deloitte. Terás sempre alguém ao teu lado para te inspirar, ajudar e desafiar a expandir os teus horizontes, enquanto exploras soluções tecnológicas diferenciadoras. Aqui, ao encontrares um ambiente dinâmico, colaborativo e humano, terás a oportunidade de desenvolver a tua melhor versão.

Além disso, as nossas equipas em Portugal têm projeção internacional, o que demonstra a nossa forte liderança global em low code/no code, em engenharia de redes de telecomunicações, em plataformas tecnológicas de transformação organizacional (ServiceNow e Apptio) e na indústria de serviços financeiros (Finastra, TIA e Guidewire).

Se tens interesse em explorar e desenvolver as tuas competências nalguma destas áreas em soluções tecnológicas - engenharia de software, cloud, integração de sistemas, data analytics & data science, cyber risk, engenharia de redes telecomunicações, UX design - e gostarias de trabalhar com tecnologias como AWS, Google, Oracle, Salesforce, SAP, Mulesoft, Feedzai e SAS, entre outras, então estás no lugar certo!

Orgulhamo-nos das nossas provas dadas de sucesso e resiliência ao longo de mais de 175 anos de história. Registamos um crescimento notório nas áreas tecnológicas e somos líderes na prestação dos nossos serviços, aos quais recorrem quatro em cada cinco empresas da Fortune Global 500®, através da nossa rede global de firmas membro, com mais de 415 mil pessoas.

Somos mais de 5500 pessoas em Portugal, das quais mais de 2600 trabalham em áreas tecnológicas, a partir de escritórios e Digital Studios em Lisboa e no Porto, e de polos tecnológicos em Braga, Viseu, Coimbra, Setúbal, Leiria e Faro.

A Deloitte é uma das empresas mais atrativas para trabalhar no mundo, segundo o ranking da Universum. Em 2023, fomos distinguidos com dois prémios nos Human Resources Awards e fazemos parte do Top5 das 25 melhores empresas para trabalhar e desenvolver carreira em Portugal.',
      NULL,
      NULL,
      '{"instagram":"https://www.instagram.com/deloitteportugal/","linkedin":"https://www.linkedin.com/company/deloitte/posts/?feedView=all"}',
      '[{"iconName":"Trophy","description":"Uma das 25 melhores empresas para trabalhar e desenvolver carreira em Portugal"},{"iconName":"Archive","description":"Mais de 5500 pessoas em Portugal"},{"iconName":"Leaf","description":"Ambiente dinâmico, colaborativo e humano"}]'
    ),
    (
      'Devscope',
      'A DevScope é especialista em dar às organizações as ferramentas e o conhecimento necessários para se manterem competitivas e um dos mais distinguidos parceiros Microsoft Portugal, tendo sido premiados Analytics Partner of the Year 2021, Power Platform Partner of the Year 2022 e Low Code Partner of the Year 2023. Ao longo de 20 anos, temos desenvolvido e implementado soluções dentro e fora de Portugal nas mais variadas áreas de atividade, do retalho à saúde, passando pelo imobiliário ou o sector público, produzindo sempre resultados duradouros.',
      NULL,
      NULL,
      '{"facebook":"https://www.facebook.com/devscope/","youtube":"https://www.youtube.com/devscope","twitter":"https://twitter.com/devscope","linkedin":"https://www.linkedin.com/company/devscope/"}',
      '[{"iconName":"Trophy","description":"Analytics Partner of the Year 2021"},{"iconName":"Trophy","description":"Power Platform Partner of the Year 2022"},{"iconName":"Trophy","description":"Low Code Partner of the Year 2023"},{"iconName":"Archive","description":"Empresa multinacional presente há 20 anos no mercado"}]'
    ),
    (
      'Devoteam',
      'NiW is a fresh chapter for a brand with a long, successful history, Rigor. For many decades, Rigor has been the trusted consultant for all brands within Grupo Salvador Caetano. Despite offering support in a variety of areas, IT has always been our passion. It moves us and keeps us evolving and new. That''s why now Rigor is NiW, your new IT partner, offering solutions, support and monitoring that switches your business to the winning side.',
      NULL,
      NULL,
      '{"linkedin":"https://www.linkedin.com/company/niw-it-services-consulting/"}',
      '[{"iconName":"Archive","description":"Antes conhecida como Rigor"},{"iconName":"Trophy","description":"+ 200 funcionários"}]'
    )
) AS v("name", "bodyText", "videoTitle", "videoHref", "socialLinks", "facts")
JOIN "Company" c ON c."name" = v."name"
ON CONFLICT ("companyId") DO NOTHING;

-- Backfill #280 part 4: company interest tags. Ensures every interest name
-- referenced by the edition files exists (several - "AI", "Mobile",
-- "Backend", "Security", "Network Administration", "Software Engineering",
-- "Frontend", "Analytics" - never matched prisma/seed.ts's canonical
-- INTERESTS list; the drift itself is exactly what #280 flags, ported here
-- verbatim rather than silently reconciled to a guessed canonical name),
-- then links each company to its interests via the implicit m:n table.
INSERT INTO "Interest" ("id", "name")
VALUES
  (gen_random_uuid(), 'AI'),
  (gen_random_uuid(), 'Mobile'),
  (gen_random_uuid(), 'Software Development'),
  (gen_random_uuid(), 'Backend'),
  (gen_random_uuid(), 'Cloud Computing'),
  (gen_random_uuid(), 'Data Analysis'),
  (gen_random_uuid(), 'Infrastructure'),
  (gen_random_uuid(), 'Security'),
  (gen_random_uuid(), 'Outsystems'),
  (gen_random_uuid(), 'Network Administration'),
  (gen_random_uuid(), 'Software Engineering'),
  (gen_random_uuid(), 'Data Science'),
  (gen_random_uuid(), 'UI/UX Design'),
  (gen_random_uuid(), 'Frontend'),
  (gen_random_uuid(), 'Devops'),
  (gen_random_uuid(), 'Artificial Intelligence'),
  (gen_random_uuid(), 'Analytics')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "_CompanyToInterest" ("A", "B")
SELECT c."id", i."id"
FROM (
  VALUES
    ('APR - Technology Solutions', 'AI'),
    ('APR - Technology Solutions', 'Mobile'),
    ('APR - Technology Solutions', 'Software Development'),
    ('APR - Technology Solutions', 'Backend'),
    ('armis', 'AI'),
    ('armis', 'Mobile'),
    ('armis', 'Software Development'),
    ('armis', 'Backend'),
    ('Cloudflare', 'Backend'),
    ('Cloudflare', 'Cloud Computing'),
    ('Cloudflare', 'Data Analysis'),
    ('hitachi', 'Backend'),
    ('hitachi', 'Cloud Computing'),
    ('hitachi', 'Data Analysis'),
    ('CGI', 'Cloud Computing'),
    ('CGI', 'Infrastructure'),
    ('CGI', 'Security'),
    ('deloitte', 'Outsystems'),
    ('deloitte', 'Network Administration'),
    ('deloitte', 'Software Engineering'),
    ('deloitte', 'Cloud Computing'),
    ('deloitte', 'Data Analysis'),
    ('deloitte', 'Data Science'),
    ('deloitte', 'UI/UX Design'),
    ('Devscope', 'AI'),
    ('Devscope', 'Software Development'),
    ('Devscope', 'Frontend'),
    ('Devoteam', 'Infrastructure'),
    ('Devoteam', 'Devops'),
    ('Devoteam', 'Artificial Intelligence'),
    ('Devoteam', 'Analytics')
) AS v("companyName", "interestName")
JOIN "Company" c ON c."name" = v."companyName"
JOIN "Interest" i ON i."name" = v."interestName"
ON CONFLICT ("A", "B") DO NOTHING;

-- Backfill #280 part 5: booth-action -> company links, replacing
-- edition/actions.ts's boothActions name-matching map for every booth
-- company still in the current roster (other historical aliases in that
-- map - e.g. akapeople, natixis, convatec, niw, konkconsulting - don't
-- match any current Company row and are intentionally left unmatched).
UPDATE "Action" a SET "companyId" = c."id"
FROM "Company" c
WHERE a."name" = 'Banca APR' AND c."name" = 'APR - Technology Solutions';

UPDATE "Action" a SET "companyId" = c."id"
FROM "Company" c
WHERE a."name" = 'Banca Hitachi' AND c."name" = 'hitachi';

UPDATE "Action" a SET "companyId" = c."id"
FROM "Company" c
WHERE a."name" = 'Banca Deloitte' AND c."name" = 'deloitte';

UPDATE "Action" a SET "companyId" = c."id"
FROM "Company" c
WHERE a."name" = 'Banca Accenture' AND c."name" = 'accenture';

UPDATE "Action" a SET "companyId" = c."id"
FROM "Company" c
WHERE a."name" = 'Banca Armis' AND c."name" = 'armis';

UPDATE "Action" a SET "companyId" = c."id"
FROM "Company" c
WHERE a."name" = 'Banca Devscope' AND c."name" = 'Devscope';

UPDATE "Action" a SET "companyId" = c."id"
FROM "Company" c
WHERE a."name" = 'Banca Glintt' AND c."name" = 'glintt';

UPDATE "Action" a SET "companyId" = c."id"
FROM "Company" c
WHERE a."name" = 'Banca msg insur:it' AND c."name" = 'msg insur:it';

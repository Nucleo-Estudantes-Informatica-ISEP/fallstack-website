-- CreateTable
CREATE TABLE "FaqEntry" (
    "id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FaqEntry_question_key" ON "FaqEntry"("question");

-- Backfill the FAQ entries that used to live only in edition/FAQ.ts (see
-- prisma/migrations/20260714023514_add_sponsor_table for the same pattern) -
-- seeding via prisma/seed.ts is disabled in production, so this is the only
-- path that actually populates this table there.
INSERT INTO "FaqEntry" ("id", "question", "answer", "order", "updatedAt")
VALUES
  (gen_random_uuid(), 'Porque é que me devo inscrever no evento?', 'O Fallstack, para além de um evento, é uma oportunidade, uma porta aberta para te dar as boas-vindas a diversas empresas responsáveis pela contínua evolução do nosso mundo. Ao inscreveres-te, vais conseguir participar em todas as experiências que este evento tem guardadas para ti, para além de seres elegível a giveaways a decorrer no evento. E claro, ter as tuas faltas justificadas!', 0, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Como me inscrevo no evento?', 'O processo de inscrição é realizado a partir da nossa plataforma oficial do evento. Basta seguires os passos indicados para a criação de uma conta e ficas automaticamente registado para o evento.', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Para entrar no evento preciso de estar inscrito?', 'Não. Todos os estudantes podem participar no evento, sendo possível estar presente em qualquer fase do mesmo sem inscrição. No entanto, com uma inscrição realizada, a dinâmica do evento muda completamente! Ao inscreveres-te ganhas a oportunidade de estabelecer um contacto mais próximo com as empresas participantes e aproveitar uma partilha de informações mais enriquecedora.', 2, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'As faltas são justificadas durante o evento?', 'Sim. As faltas serão justificadas durante o período em que estejas presente no evento, desde que sejas estudante do 3º Ano da Licenciatura em Engenharia Informática e estejas inscrito na plataforma do FallStack! Estas justificações não se aplicam às aulas em que se realizem avaliações ou outros momentos inadiáveis.', 3, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'O meu CV vai ser enviado para as empresas?', 'Sim! Uma das oportunidades que a criação de um perfil na nossa plataforma te dá é a partilha de forma fácil do teu CV com as empresas participantes do evento. Basta fazeres upload do teu CV no teu perfil e interagires com as empresas no decorrer do evento. Posteriormente estas conseguem guardar o teu perfil e, consequentemente, o teu CV.', 4, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Há oportunidade para fazer perguntas?', 'Sim! No primeiro dia do evento, dia 25 de novembro, as empresas têm tempos dedicados para realizarem uma apresentação na qual serão discutidos tópicos como quem são, os seus valores e missão e o que procuram. No fim de cada apresentação terás a oportunidade de participar no Q&A para teres todas as tuas dúvidas e curiosidades esclarecidas!', 5, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Existem workshops ou atividades práticas durante o evento?', 'Não. O Fallstack foca-se em trazer o contacto direto entre as empresas e os estudantes a partir de apresentações (dia 25) e por interações diretas (dia 26). Fica atento às redes sociais do NEI-ISEP para outros momentos que organizamos ao longo do ano com esse intuito.', 6, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Quais são os benefícios de participar no evento?', 'Ao participares neste evento estás a dar a ti próprio uma prenda: um futuro académico e profissional mais promissor. No Fallstack terás a oportunidade de interagir com empresas de renome, reconhecidas pela sua excelência e profissionalismo, que irão estar presentes para ti, para te conhecerem e para encontrarem os talentos do amanhã. É uma oportunidade de ficares a conhecer melhor o que o teu futuro te reserva e o que faz desta área algo tão especial e única. Vemo-nos lá!', 7, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'As apresentações das empresas são gravadas?', 'Não, as apresentações das empresas não serão gravadas. A única oportunidade de assistires será presencialmente, no dia em que ocorrerem.', 8, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Existe algum custo associado ao evento?', 'Não, o Fallstack é um evento gratuito. Foi criado com o objetivo de ajudar estudantes a explorarem e definirem os seus próximos passos no percurso académico e profissional, garantindo acessibilidade a todos.', 9, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'É necessário trazer qualquer tipo de material para o evento?', 'Para os inscritos no evento, é importante trazer um dispositivo com sessão iniciada no website oficial do Fallstack, para poderes aproveitar ao máximo todas as funcionalidades exclusivas. Para os não inscritos, não é necessário trazer material adicional, mas recomendamos que venham preparados para tirar notas ou registar contactos importantes.', 10, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'É possível partilhar o LinkedIn em vez do CV?', 'Sim, o segundo dia do Fallstack - Connection''s Train - é dedicado ao networking direto com as empresas. Durante as conversas, podes perguntar às empresas se preferem receber o teu LinkedIn ou o teu CV. No entanto, é sempre uma mais-valia ter um CV atualizado contigo.', 11, CURRENT_TIMESTAMP)
ON CONFLICT ("question") DO NOTHING;

-- Repair copied Portuguese fallback content without replacing custom English edits.
UPDATE "FaqEntry" AS faq
SET "question" = CASE
      WHEN COALESCE(faq."question"->>'EN', '') IN ('', faq."question"->>'PT')
      THEN jsonb_set(faq."question"::jsonb, '{EN}', to_jsonb(copy.question_en))
      ELSE faq."question"::jsonb END,
    "answer" = CASE
      WHEN COALESCE(faq."answer"->>'EN', '') IN ('', faq."answer"->>'PT')
      THEN jsonb_set(faq."answer"::jsonb, '{EN}', to_jsonb(copy.answer_en))
      ELSE faq."answer"::jsonb END,
    "updatedAt" = CURRENT_TIMESTAMP
FROM (VALUES
('Porque é que me devo inscrever no evento?', 'Why should I register for the event?', 'Fallstack is an opportunity to meet companies shaping the future of technology. Registering lets you take part in the event''s experiences and become eligible for its giveaways.'),
('Como me inscrevo no evento?', 'How do I register for the event?', 'Register through the official event platform. Follow the steps to create an account and you will be registered for the event.'),
('Para entrar no evento preciso de estar inscrito?', 'Do I need to register to attend?', 'No. All students can attend the event without registering. Registration gives you additional ways to connect with participating companies and share your professional information.'),
('O meu CV vai ser enviado para as empresas?', 'Will my CV be shared with companies?', 'Creating a profile lets you share your CV with participating companies. Upload your CV and interact with companies during the event; they can then save your profile and CV.'),
('Há oportunidade para fazer perguntas?', 'Will there be an opportunity to ask questions?', 'Yes. Companies give presentations on the first day, introducing who they are, their values, mission and opportunities. At the end of each presentation you can take part in the Q&A.'),
('Existem workshops ou atividades práticas durante o evento?', 'Are there workshops or practical activities?', 'No. Fallstack focuses on direct contact between students and companies through presentations on the first day and in-person interactions on the second. Follow NEI-ISEP''s social media for other activities throughout the year.'),
('Quais são os benefícios de participar no evento?', 'What are the benefits of attending?', 'Fallstack gives you the opportunity to meet leading companies, learn about their work and opportunities, and explore the next steps in your academic and professional future.'),
('As apresentações das empresas são gravadas?', 'Are company presentations recorded?', 'No. Company presentations will not be recorded. You can attend them in person on the day they take place.'),
('Existe algum custo associado ao evento?', 'Is there a cost to attend?', 'No. Fallstack is free to attend. It helps students explore their next academic and professional steps and is accessible to everyone.'),
('É necessário trazer qualquer tipo de material para o evento?', 'Do I need to bring anything?', 'Registered participants should bring a device signed in to the official Fallstack website to use its features. Other attendees do not need additional equipment, but may wish to take notes and save useful contacts.'),
('É possível partilhar o LinkedIn em vez do CV?', 'Can I share my LinkedIn instead of a CV?', 'Yes. The second day is dedicated to direct networking with companies. You can ask whether they prefer your LinkedIn profile or CV. Having an up-to-date CV is still useful.')
) AS copy(question_pt, question_en, answer_en)
WHERE faq."question"->>'PT' = copy.question_pt
  AND (COALESCE(faq."question"->>'EN', '') IN ('', faq."question"->>'PT')
    OR COALESCE(faq."answer"->>'EN', '') IN ('', faq."answer"->>'PT'));

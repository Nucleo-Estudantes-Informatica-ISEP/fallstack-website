# Offseason Mode — Fallstack

## Objetivo

O Offseason Mode permite apresentar uma página de encerramento do Fallstack e impedir novas inscrições após o evento, mantendo os dados e os perfis dos participantes existentes.

A ativação é controlada pela variável de ambiente `EVENT_MODE`.

## Modos disponíveis

| Valor       | Comportamento                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `active`    | Mantém o funcionamento normal do website e das inscrições.                                             |
| `offseason` | Apresenta a página de encerramento e bloqueia novas inscrições de estudantes, funcionários e empresas. |

O valor predefinido é `active`.

A variável `SHOWCASE_FULL_WEBSITE` continua a controlar a apresentação do website completo ou da página de contagem decrescente quando o evento está ativo.

O modo `offseason` tem prioridade sobre essa variável na página inicial.

## Ativação no Coolify

**Pré-condições:**

- O evento terminou.
- A equipa aprovou o texto e o design da página de encerramento.
- A versão com suporte para `EVENT_MODE` foi publicada.
- Existe um procedimento de recuperação dos dados, caso seja necessário.

**Procedimento:**

1. Abrir o projeto Fallstack no Coolify.
2. Selecionar a aplicação web correspondente ao website.
3. Abrir as variáveis de ambiente da aplicação.
4. Definir `EVENT_MODE=offseason`.
5. Guardar a alteração.
6. Efetuar o redeploy da aplicação web para aplicar a nova configuração.
7. Confirmar que o deployment terminou sem erros.

**Não alterar nem eliminar:**

- Base de dados PostgreSQL.
- Armazenamento MinIO.
- Redis.
- Serviço de autenticação AuthNEI/ZITADEL.
- Volumes persistentes.
- Dados dos estudantes e das empresas.

O offseason não requer a desativação destes serviços.

## Verificação após ativação

Confirmar manualmente:

1. A página inicial apresenta a landing page de encerramento.
2. A página `/signup` apresenta a mensagem «Inscrições encerradas».
3. A API `POST /api/students` rejeita novas inscrições válidas com HTTP `403`.
4. A API `POST /api/auth/signup/employee` rejeita novas inscrições válidas com HTTP `403`.
5. A API `POST /api/companies` rejeita novos registos válidos com HTTP `403`.
6. Os estudantes que já têm perfil continuam a conseguir aceder-lhe.
7. A listagem administrativa de empresas continua disponível.
8. Os dados existentes continuam disponíveis.
9. Os serviços partilhados continuam operacionais.
10. Os logs da aplicação não apresentam erros inesperados.

Os testes das APIs devem ser executados com pedidos válidos e sessões autenticadas.

## Rollback — Reativar o modo normal

Para reabrir o website e as inscrições:

1. Abrir a aplicação web no Coolify.
2. Alterar a variável para `EVENT_MODE=active`.
3. Guardar a alteração.
4. Efetuar o redeploy da aplicação web.
5. Confirmar que a página inicial voltou ao comportamento esperado.
6. Confirmar que a página `/signup` voltou a permitir o fluxo normal de inscrição.
7. Confirmar que os endpoints de inscrição voltaram ao comportamento normal.

O rollback não requer migrações nem eliminação de dados.

## Testes automatizados

Executar na raiz do repositório:

```bash
pnpm typecheck

pnpm exec vitest run \
  src/config/env.server.test.ts \
  'src/app/(guest)/page.test.tsx' \
  'src/app/(student-signup)/signup/page.test.tsx' \
  src/app/api/students/route.test.ts \
  src/app/api/auth/signup/employee/route.test.ts \
  src/app/api/companies/route.test.ts
```

## Notas de segurança

- O modo offseason não elimina contas nem perfis.
- O bloqueio das inscrições é aplicado no servidor.
- Os serviços partilhados não devem ser desligados.
- A ativação em produção exige aprovação da equipa.
- O texto e o design da landing page devem ser aprovados antes da publicação.
- A alteração de `EVENT_MODE` não exige migrações da base de dados.

## Limitações

Este modo bloqueia os fluxos de inscrição identificados na implementação. Não representa, por si só, uma desativação global de todas as funcionalidades de escrita da aplicação.

Antes da ativação em produção, devem ser revistos outros eventuais endpoints que permitam criar inscrições por caminhos alternativos.

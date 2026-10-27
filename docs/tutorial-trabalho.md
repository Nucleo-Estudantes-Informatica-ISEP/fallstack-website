# Fallstack — guia de trabalho da equipa

Este guia serve para começar a contribuir: preparar o projeto, perceber onde
mexer, abrir um Pull Request (PR) e responder à revisão. Pode ser guardado na
Drive como Markdown; os links apontam para o GitHub e funcionam fora do repositório.
A versão mantida pela equipa deve continuar no repositório, junto do código.

**Percurso habitual:** tarefa → branch a partir de `dev` → alterações → testes
→ commit → push → PR para `dev` → revisão → merge.

## 1. Antes de começar

- Confirma que tens acesso ao
  [repositório](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website)
  e consulta o
  [quadro de tarefas](https://github.com/orgs/Nucleo-Estudantes-Informatica-ISEP/projects/11).
- Escolhe uma tarefa com objetivo e critérios de aceitação claros. Combina com
  a equipa quem fica responsável, para evitar trabalho duplicado.
- Lê o [README](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/blob/dev/README.md)
  e as [regras de contribuição](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/blob/dev/docs/agents/contribution.md).
  Este tutorial resume essas regras; consulta os documentos de referência
  quando precisares de mais detalhe.

### Preparação inicial

Precisas de Git, Node.js 24+, pnpm 10 e serviços de desenvolvimento:
PostgreSQL 16, MinIO e um cliente OIDC AuthNEI/ZITADEL. Pede as credenciais de
desenvolvimento a um responsável; não uses as de produção.

```bash
git clone https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website.git
cd fallstack-website
git switch dev
git pull --ff-only
corepack enable
pnpm install
cp .env.example .env
```

Se não tiveres Corepack, instala o pnpm na versão indicada em `package.json`.
Depois de preencheres `.env` e preparares os serviços conforme o README:

```bash
pnpm migrate:deploy
pnpm dev
```

A aplicação fica em `http://localhost:3000`. O login só funciona com o cliente
OIDC e o callback configurados. O README explica os buckets de MinIO e a
configuração de Wallet para instalações que nunca emitiram passes.

**Nunca publiques `.env`, tokens, palavras-passe, CVs ou dados pessoais em
commits, PRs ou na Drive.** Partilha apenas exemplos sem segredos. Confirma
sempre a base de dados de destino antes de executar migrações ou scripts.

## 2. Começar uma tarefa

Um **branch** isola o teu trabalho; um **commit** regista uma alteração local;
um **push** envia os commits para o GitHub; um **PR** propõe integrá-los e
permite à equipa rever o trabalho.

Começa com a árvore de trabalho limpa. Se `git status` mostrar alterações de
outra tarefa, resolve-as antes de mudar de branch; não as apagues para avançar.

```bash
git status
git switch dev
git pull --ff-only
git switch -c fix/student-profile-validation
```

O nome acima é um exemplo. Usa `<tipo>/<descricao-curta-em-kebab-case>`:

| Tipo                  | Quando usar                               | Exemplo                          |
| --------------------- | ----------------------------------------- | -------------------------------- |
| `feat/` ou `feature/` | Funcionalidade nova                       | `feat/company-search`            |
| `fix/` ou `bugfix/`   | Correção de erro                          | `fix/student-profile-validation` |
| `docs/`               | Só documentação                           | `docs/team-guide`                |
| `chore/`              | Ferramentas, configuração ou dependências | `chore/update-tooling`           |
| `hotfix/`             | Correção urgente de produção              | `hotfix/login-redirect`          |
| `release/`            | Preparação de uma versão                  | `release/2026-edition`           |

Não trabalhes diretamente em `dev` ou `main`. Mantém cada PR focado numa
tarefa; evita misturar uma correção com uma reformulação sem relação.

## 3. Como está organizado o Fallstack

O site usa **Next.js 15 + React 18 + TypeScript**, com Tailwind CSS 4 e HeroUI.
Os dados ficam em PostgreSQL, via Prisma; os ficheiros ficam em MinIO; o login
usa AuthNEI/ZITADEL. O pnpm gere as dependências e os comandos do projeto.

| Local                                        | O que procurar ou alterar                                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`                                   | Páginas, layouts e rotas de API (`api/**/route.ts`). Os grupos `(auth)`, `(admin)`, `(guest)` e `(profiles)` organizam rotas. |
| `src/components/`                            | Componentes em `<PascalCaseName>/index.tsx`; primitivas reutilizáveis em `ui/`.                                               |
| `src/client/api/`                            | Chamadas HTTP do browser, através de `httpClient`; código `client-only`.                                                      |
| `src/application/services/`                  | Coordenação de operações, repositórios e serviços externos; código `server-only`.                                             |
| `src/application/repositories/`              | Consultas à base de dados através do Prisma.                                                                                  |
| `src/domain/`                                | Regras de negócio puras, sem acesso à BD, rede ou ficheiros.                                                                  |
| `src/schemas/`                               | Validação de entradas com Zod.                                                                                                |
| `src/config/`                                | Configuração e validação de variáveis de ambiente.                                                                            |
| `src/edition/`                               | Constantes da edição, como branding e nomes/ações para seed.                                                                  |
| `src/lib/`, `src/utils/`                     | Infraestrutura/helpers partilhados e utilitários genéricos; verifica o contexto servidor/browser antes de importar.           |
| `src/hooks/`, `src/contexts/`, `src/types/`  | Hooks, estado React partilhado e tipos.                                                                                       |
| `prisma/schema.prisma`, `prisma/migrations/` | Modelos e histórico de alterações à BD.                                                                                       |
| `public/`                                    | Recursos estáticos.                                                                                                           |
| `tests/e2e/`                                 | Testes de integração e smoke; testes unitários ficam junto do código.                                                         |
| `.github/workflows/`                         | Checks automáticos de CI.                                                                                                     |
| `docs/`                                      | Arquitetura, decisões, operação e procedimentos.                                                                              |

### Que caminho seguir numa alteração?

Numa funcionalidade que lê ou altera dados, o percurso habitual é:

```text
Página/componente
  → wrapper em client/api (quando a chamada parte do browser)
  → rota em app/api (defineHandler + schema Zod)
  → serviço em application/services
  → repositório em application/repositories
  → PostgreSQL (Prisma)
```

As páginas de servidor também podem chamar serviços diretamente. Regras puras
ficam em `domain/`, usadas pelos serviços. Não é preciso criar todas estas
peças em cada tarefa: reutiliza as existentes e altera só o necessário.

- **Aspeto visual:** começa na página e no componente correspondente.
- **Validação:** procura o schema em `schemas/` e a regra em `domain/` ou no
  serviço; uma validação no formulário não substitui a validação no servidor.
- **Endpoint:** mantém a rota fina, usa `defineHandler` para JSON e delega no
  serviço. Novos erros devem ter `{ error: string }` e estado HTTP explícito.
- **Dados:** só os repositórios devem fazer consultas Prisma em runtime.
  Alterações de schema precisam de migração; não uses `db push`.
- **Conteúdo do evento:** empresas/escalões, associação stand–ação,
  patrocinadores, FAQ e horário são geridos na BD/backoffice. Não cries listas
  estáticas para estes conteúdos em `edition/`.
- **Configuração:** usa `serverEnv` para segredos e `clientEnv` para valores
  `NEXT_PUBLIC_*`; estes últimos são públicos. Mantém os schemas e
  `.env.example` sincronizados. Novas variáveis públicas também precisam da
  ligação de build em Docker/Compose.

Para um exemplo real, consulta
[`src/app/api/saved/route.ts`](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/blob/dev/src/app/api/saved/route.ts)
e segue as chamadas para os serviços e repositórios. A
[arquitetura](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/blob/dev/docs/architecture.md)
explica as fronteiras e as exceções.

## 4. Implementar e verificar

Lê primeiro o código e os testes próximos. Reutiliza componentes, wrappers e
padrões existentes. Num bug, tenta primeiro escrever um teste que reproduza a
falha; depois implementa a menor correção. Alterações de comportamento precisam
de teste de regressão no nível mais útil.

Antes de pedir revisão de uma alteração de código, executa, por ordem:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm exec prisma validate
```

Os testes de integração precisam de uma BD de desenvolvimento com as migrações
aplicadas. Se faltar um serviço ou acesso, regista exatamente o que não
conseguiste verificar; não marques esse passo como concluído.

Depois, usa `pnpm dev` para experimentar o fluxo alterado. Numa API, confirma
o corpo da resposta **e** o estado HTTP; numa interface, interage com o fluxo
e verifica estados de erro/permissões relevantes. Mudanças de PWA/cache exigem
também verificação num dispositivo real ou PWA instalada.

**Se mudares apenas documentação**, verifica conteúdo, links, nomes de
ficheiros e os comandos abaixo, substituindo o caminho pelo Markdown alterado:

```bash
git diff --check
pnpm exec prettier --check docs/tutorial-trabalho.md
```

Nesse caso não é necessário correr a aplicação nem os checks locais de código.
O CI continua a executar os seus checks. Builds Docker e verificações de
containers são responsabilidade do CI, não são exigidos localmente.

Se alterares a BD, segue o
[guia de migrações](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/blob/dev/docs/database-workflow.md):
gera uma migração local com `pnpm migrate --name descricao`, revê o SQL e
inclui-a no commit. Não uses scripts de reset/wipe em serviços partilhados.

## 5. Fazer commit e push

Revê o diff e escolhe explicitamente os ficheiros. Neste exemplo, adapta o
caminho e a mensagem à tua tarefa:

```bash
git status
git diff
git add src/schemas/patchStudentSchema.ts
git diff --cached
git commit -m "fix: validate student profile fields"
git push -u origin fix/student-profile-validation
```

Mensagens seguem Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`,
`refactor:`, `test:`, etc. Assunto com menos de 72 caracteres e sem trailer de
coautoria de IA. Se houver preocupações independentes, separa os commits.

## 6. Abrir um Pull Request

No GitHub, entra em **Pull requests → New pull request**. Escolhe:

- **base:** `dev` — destino das alterações;
- **compare:** o teu branch — por exemplo, `fix/student-profile-validation`.

Revê **Files changed** e preenche o
[template do PR](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/blob/dev/.github/PULL_REQUEST_TEMPLATE.md):

1. **Issue:** identifica a tarefa existente. Se não houver issue correspondente,
   remove a secção; não inventes uma só para preencher o campo.
2. **Summary:** problema, alteração e comportamento final esperado.
3. **Tests:** checks realmente executados e resultados; explica os restantes.
4. **Manual testing steps:** passos para reproduzir a validação e resultado
   esperado. Acrescenta capturas sem dados pessoais se ajudarem numa mudança de UI.
5. **Configuration / migration:** migrações, variáveis de ambiente, storage ou
   deploy afetados; escreve `None` se não houver alterações.
6. **Observations:** riscos, limitações ou dependências relevantes.

Adiciona labels existentes adequadas (`docs`, `bug`, `feature`, etc.), atribui
o PR ao seu autor e pede revisão a alguém da equipa. Usa draft enquanto o
trabalho estiver incompleto.

Se houver issue, estabelece e confirma a associação na área **Development**
do GitHub, na issue ou no PR. Uma menção `Refs #N` não chega. Como o destino é
`dev` e a branch por omissão é `main`, não confies apenas em `Closes #N` para
criar a associação ou fechar a issue. Não feches uma tarefa maior se o PR só
cumprir parte do seu âmbito.

## 7. Revisão, conflitos e conclusão

O CI executa testes, TypeScript, lint, build, validação Prisma e checks Docker;
o workflow de segurança executa Gitleaks. Corrige falhas antes de pedir merge.
Checks verdes não substituem a revisão da equipa nem o teste do fluxo.

Responde aos comentários e envia correções para **o mesmo branch**. Um novo
commit + `git push` atualiza o PR automaticamente; não precisas de outro PR.

Para integrar alterações entretanto feitas em `dev`, começa com o teu trabalho
guardado em commits e a árvore limpa, e executa no branch da tarefa:

```bash
git fetch origin
git merge origin/dev
```

Se houver conflitos, usa `git status`, abre os ficheiros indicados e resolve
os blocos `<<<<<<<`, `=======` e `>>>>>>>`, preservando o comportamento correto
dos dois lados. Revê o resultado com a equipa se não souberes qual manter.
Faz `git add` dos ficheiros resolvidos, conclui o merge com `git commit`,
repete os checks afetados e faz `git push`. Para desistir de um merge em curso,
usa `git merge --abort`. Não uses force-push para contornar conflitos.

Depois da revisão e dos checks aprovados, a equipa integra o PR em `dev`.
Confirma o merge antes de apagar o branch. Atualiza o teu `dev` com
`git switch dev` e `git pull --ff-only` antes da tarefa seguinte.

`main` é a branch de produção: recebe uma promoção revista de `dev` através
de um PR de release, e o Coolify faz o deploy. Um PR integrado em `dev` não
significa que a alteração já esteja em produção.

## Checklist antes de pedir revisão

- [ ] Branch criado a partir de `dev`; PR aponta para `dev`.
- [ ] Alterações focadas e diff revisto; nenhum segredo ou dado pessoal incluído.
- [ ] Testes adequados e checks aplicáveis passaram; limitações declaradas.
- [ ] Fluxo alterado experimentado quando há mudança de comportamento.
- [ ] Template preenchido; labels, autor e associação à issue confirmados.
- [ ] Documentação/migração/configuração atualizadas quando necessário.
- [ ] Revisor da equipa solicitado; comentários e falhas de CI tratados.

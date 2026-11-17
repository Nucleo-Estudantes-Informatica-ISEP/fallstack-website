# Estratégia de SEO da Fallstack

Este documento descreve a arquitetura, política de indexação e procedimentos operacionais para assegurar o correto posicionamento do website da Fallstack nos motores de pesquisa.

---

## 1. Contexto e Objetivos

Historicamente, o Google indexava versões de staging (`staging.fallstack.nei-isep.org`) e repositórios/edições arquivadas à frente da edição atual em produção (`fallstack.nei-isep.org`).
O objetivo desta estratégia é:
1. **Priorizar a produção:** Estabelecer a edição atual (9ª edição, 2026) como a única fonte canónica.
2. **Desindexar staging:** Garantir que o ambiente de staging não é indexável sem bloquear prematuramente o crawler no `robots.txt`.
3. **Preservar edições históricas:** Manter arquivos acessíveis sem confundir motores de busca nem canibalizar tráfego.
4. **Oferecer metadados e dados estruturados ricos:** Meta tags completas, Open Graph, Twitter Cards, `hreflang` e Schema.org (`Event`, `WebSite`).

---

## 2. Política de Indexação por Ambiente

### Produção (`https://fallstack.nei-isep.org`)
- **Indexação:** Permitida (`index, follow`).
- **Robots Tag:** Permite snippet, imagens em tamanho grande (`max-image-preview: large`) e pré-visualização.
- **`robots.txt`:**
  - `Allow: /`
  - Bloqueia caminhos privados e de autenticação (`/api/`, `/dashboard`, `/student/`, `/admin/`, `/login`, `/signup`, etc.).
  - Aponta para `https://fallstack.nei-isep.org/sitemap.xml`.
- **`sitemap.xml`:** Publica apenas URLs públicas canónicas da produção (`/event/pt`, `/event/en`, `/about`, `/privacy-policy`, `/terms` e perfis públicos de empresas).

### Staging (`https://staging.fallstack.nei-isep.org`)
- **Indexação:** Estritamente proibida (`noindex, nofollow, noarchive`).
- **Cabeçalho HTTP:** O middleware injeta `X-Robots-Tag: noindex, nofollow, noarchive` em todas as respostas (HTML, API, etc.).
- **Detetor Multi-Fator:**
  1. Hostname do pedido (`request.nextUrl.hostname`, `host` ou `x-forwarded-host`).
  2. Variáveis de ambiente (`APP_ENV=staging`, `IS_STAGING=true`, `NEXT_PUBLIC_BASE_URL` ou `SERVICE_URL_WEB` apontando para staging).
  3. **Guarda de Segurança Absoluta:** O domínio oficial de produção (`fallstack.nei-isep.org`) **nunca** recebe `noindex`, mesmo que variáveis de ambiente estejam incorretamente definidas.
- **`robots.txt` em Staging:** Permite crawling (`Allow: /`) e **não** declara sitemap.
  > **Nota crucial:** Se o staging bloqueasse o crawler com `Disallow: /`, o Googlebot não conseguiria aceder às páginas para ler o cabeçalho `X-Robots-Tag: noindex`, mantendo as URLs de staging eternamente no índice.
- **`sitemap.xml` em Staging:** Devolve uma lista vazia (`[]`), impedindo a submissão de URLs de staging.

---

## 3. Configuração no Coolify e Traefik

A aplicação trata a deteção e emissão de `X-Robots-Tag` diretamente no código via Next.js Middleware. No entanto, para proteção em profundidade na camada de proxy:

### Variáveis de Ambiente no Coolify
- **Produção:**
  - `SERVICE_URL_WEB=https://fallstack.nei-isep.org`
  - `NEXT_PUBLIC_BASE_URL=https://fallstack.nei-isep.org/api`
  - `APP_ENV=production`
- **Staging:**
  - `SERVICE_URL_WEB=https://staging.fallstack.nei-isep.org`
  - `NEXT_PUBLIC_BASE_URL=https://staging.fallstack.nei-isep.org/api`
  - `APP_ENV=staging`
  - `IS_STAGING=true`

### Traefik Labels (opcional / defesa em profundidade para Staging)
No Coolify Staging, se desejado injetar cabeçalhos no proxy Traefik:
```yaml
labels:
  - "traefik.http.middlewares.staging-robots.headers.customresponseheaders.X-Robots-Tag=noindex, nofollow, noarchive"
  - "traefik.http.routers.web.middlewares=staging-robots"
```

---

## 4. URLs Canónicas e Internacionalização

- Todas as URLs canónicas usam o domínio oficial: `https://fallstack.nei-isep.org`.
- A raiz `/` executa redirecionamento temporário (HTTP 307) baseado no idioma (`/event/pt` ou `/event/en`).
- As páginas do evento implementam `hreflang` recíproco e `x-default`:
  ```html
  <link rel="canonical" href="https://fallstack.nei-isep.org/event/pt" />
  <link rel="alternate" hreflang="pt" href="https://fallstack.nei-isep.org/event/pt" />
  <link rel="alternate" hreflang="en" href="https://fallstack.nei-isep.org/event/en" />
  <link rel="alternate" hreflang="x-default" href="https://fallstack.nei-isep.org/" />
  ```
- O atributo `<html lang="...">` é mantido consistente com o idioma visualizado (`pt` ou `en`).

---

## 5. Dados Estruturados (Schema.org)

A página do evento injeta dados estruturados em formato JSON-LD:
- **`Event`:**
  - Nome: `Fallstack 2026 - 9ª Edição`
  - Datas reais: `2026-11-17T08:30:00+00:00` a `2026-11-18T17:30:00+00:00`
  - Local: `Instituto Superior de Engenharia do Porto (ISEP)`, Rua Dr. António Bernardino de Almeida, 431, Porto
  - Organizador: `Núcleo de Estudantes de Informática do ISEP (NEI-ISEP)` (`https://www.nei-isep.org`)
  - Oferta: Entrada gratuita (`price: "0"`, `priceCurrency: "EUR"`)
- **`WebSite`:**
  - Nome: `Fallstack 2026`
  - URL oficial: `https://fallstack.nei-isep.org`
  - Publisher: `NEI-ISEP`

---

## 6. Procedimento Manual no Google Search Console

Após o deployment das correções:

1. **Propriedades no Search Console:**
   - Confirmar se a propriedade `https://fallstack.nei-isep.org/` está verificada.
   - Adicionar e verificar a propriedade `https://staging.fallstack.nei-isep.org/`.
2. **Desindexação de Staging:**
   - Na propriedade de staging, ir a **Remoções** (Removals) > **Novo Pedido** (New Request) e submeter a remoção temporária de todas as URLs sob `https://staging.fallstack.nei-isep.org/`.
   - Como o staging devolve `X-Robots-Tag: noindex, nofollow`, à medida que o Googlebot recrawler o staging, as páginas serão permanentemente expurgadas do índice.
3. **Reindexação da Produção:**
   - Na propriedade de produção, usar a ferramenta de **Inspeção de URL** (URL Inspection) com `https://fallstack.nei-isep.org/event/pt`.
   - Clicar em **Testar URL em direto** (Test Live URL) e validar que:
     - O canonical declarado é `https://fallstack.nei-isep.org/event/pt`.
     - O crawler reporta "A indexação é permitida" (Indexing allowed: Yes).
     - Os dados estruturados (`Event`) são detetados sem erros.
   - Clicar em **Pedir Indexação** (Request Indexing).
4. **Submissão do Sitemap:**
   - Ir a **Sitemaps** e submeter: `https://fallstack.nei-isep.org/sitemap.xml`.

---

## 7. Validação de SEO Após Cada Deploy

Executar smoke test HTTP:
```bash
# 1. Verificar cabeçalho de staging (deve ter X-Robots-Tag)
curl -sI https://staging.fallstack.nei-isep.org/event/pt | grep -i "x-robots-tag"
# Esperado: X-Robots-Tag: noindex, nofollow, noarchive

# 2. Verificar cabeçalho de produção (NÃO deve ter noindex)
curl -sI https://fallstack.nei-isep.org/event/pt | grep -i "x-robots-tag"
# Esperado: vazio

# 3. Validar robots.txt de produção
curl -s https://fallstack.nei-isep.org/robots.txt
# Esperado: Allow: /, Disallow caminhos privados, Sitemap: https://fallstack.nei-isep.org/sitemap.xml

# 4. Validar sitemap.xml de produção
curl -s https://fallstack.nei-isep.org/sitemap.xml
# Esperado: lista de URLs com https://fallstack.nei-isep.org/...
```

---

## 8. Como Adicionar uma Nova Edição

Quando for preparada uma nova edição (ex.: Fallstack 2027 - 10ª Edição):
1. Em `src/edition/branding.ts`:
   - Atualizar `year` (ex.: `2027`).
   - Atualizar `editionNumber` (ex.: `10`) e `editionOrdinal` (ex.: `"10ª"`).
   - Atualizar as datas do evento em `event.startsAt`, `event.endsAt` e horários.
   - Atualizar `metadata.title` e `metadata.description`.
2. Em `src/components/Hero/index.tsx`:
   - Atualizar o texto editorial para a nova edição.
3. As URLs canónicas mantêm-se associadas ao domínio principal, garantindo transferência contínua de autoridade de domínio (Domain Authority) ano após ano.

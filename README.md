# Arquiteure

Plataforma autoevolutiva de arquitetura, engenharia e planeamento urbano,
focada no enquadramento legal português. O utilizador descreve uma intenção
— por texto, voz ou fotografia — e o sistema devolve alternativas projetuais
validadas contra o RGEU, RJUE, DL 163/2006 (acessibilidade), RJ-SCIE e
instrumentos de gestão territorial municipais.

## Princípios

1. **Nada é definitivo sem aprovação humana.** Todas as decisões ficam em
   estado `PROPOSED` até revisão por arquiteto/engenheiro inscrito.
2. **Rastreabilidade total.** Cada alternativa cita as regras aplicadas e é
   registada num histórico imutável (`AuditEvent` + `ProjectVersion`).
3. **Distinção de fases.** Conceito / anteprojeto / projeto de execução /
   documento para submissão são estados explícitos.
4. **Hipóteses marcadas.** Tudo o que o LLM deduz é etiquetado `[HIPÓTESE]`.
5. **Base de conhecimento autoevolutiva.** Um worker agendado compara as
   fontes oficiais (DRE, PDMs) com as regras armazenadas e cria `RuleUpdate`
   para revisão humana.

## Arquitetura

Monorepo `pnpm` com TypeScript estrito. Todos os packages são ESM.

```
apps/
  web/            Next.js 14 (App Router) + tRPC + React Query
  worker/         Cron worker (node-cron) — atualização de regras PT
packages/
  core/           Tipos e schemas Zod partilhados
  db/             Prisma client (PostgreSQL)
  audit/          Versões imutáveis + audit trail
  ai/             Wrapper Claude (Anthropic SDK) + Whisper STT
  intent/         Extração de programa funcional via LLM
  vision/         Análise de fotos/plantas via Claude vision
  voice/          Speech-to-text
  knowledge/      Base de regras PT (RGEU, RJUE, DL 163/2006…) + predicados
  validator/      Motor de avaliação de regras contra layouts
  generator/      Gerador de layouts por slicing + scoring multi-critério
  drawing/        Render Layout → SVG
  exporter/       Dossier PDF, memória descritiva, DXF
  updater/        Crawler de fontes legais + diff via LLM
  api/            Router tRPC central
prisma/
  schema.prisma
scripts/
  seed-knowledge.ts     Carrega as regras PT iniciais
  update-knowledge.ts   Corre manualmente o ciclo de atualização
```

## Setup local

```bash
pnpm install
cp .env.example .env            # preencher ANTHROPIC_API_KEY, etc.
docker compose up -d postgres redis minio
pnpm db:generate
pnpm db:push
pnpm seed                       # carrega regras PT
pnpm --filter @arquiteure/web dev
pnpm --filter @arquiteure/worker dev   # noutra shell
```

Abre `http://localhost:3000`. Em dev, autenticas-te via cookie
`arquiteure-demo=<id>` (definir manualmente no browser).

## Fluxo típico

1. Cliente cria projeto (tipo, município, descrição livre).
2. Cliente descreve intenção por texto / voz / foto.
3. `@arquiteure/intent` extrai `ProgramRequirements` estruturado.
4. `@arquiteure/generator` produz N alternativas de layout.
5. `@arquiteure/validator` confronta cada layout com as regras aplicáveis
   devolvidas por `@arquiteure/knowledge`.
6. Cada alternativa recebe um score legal/funcional/estético/económico.
7. Arquiteto revê, abre `ApprovalGate` por cada domínio (LEGAL, STRUCTURAL,
   URBAN, SAFETY, ACCESSIBILITY) e aprova explicitamente.
8. `@arquiteure/exporter` emite dossier PDF + DXF + memória descritiva em
   Markdown conforme estrutura aceite por câmaras municipais.

## Base de conhecimento

As regras vivem em `packages/knowledge/src/seed-pt.ts`, cada uma com:

- `code` — identificador único (ex: `RGEU-65`)
- `source` — referência legal citável
- `textMd` — texto humano
- `predicate` — versão executável avaliada pelo motor do validator

O ciclo do worker (`apps/worker`) corre diariamente (`KNOWLEDGE_UPDATE_CRON`)
e, para cada regra, descarrega a fonte oficial, pede ao Claude que identifique
alterações materiais, e cria um `RuleUpdate` + evento de auditoria. **Nunca
escreve por cima de uma regra vigente** — a promoção exige revisão humana.

## Testes

```bash
pnpm test                       # vitest em packages/*/test
```

Cobertura atual: seed PT, motor de validação (pé-direito, área mínima),
gerador de layouts.

## Notas legais

Esta plataforma é uma ferramenta de apoio. Não substitui a responsabilidade
técnica de projetistas inscritos na Ordem dos Arquitetos ou Ordem dos
Engenheiros. A verificação automatizada cobre um subconjunto das normas
aplicáveis; a submissão formal exige revisão humana.

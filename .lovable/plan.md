
## Visão geral

App multi-usuário para gerar links curtos (sempre no formato `{codigo}-web3brasil`) apontando para grupos de Telegram/Discord/WhatsApp, com analytics de cliques e — quando possível — confirmação real de entrada no grupo via bots externos.

Vou habilitar **Lovable Cloud** (backend gerenciado) para auth, banco e endpoints públicos dos webhooks.

## Papéis

- **Admin**: cria/ativa/desativa/exclui funcionários, vê todos os links e analytics consolidado com filtro por funcionário.
- **Funcionário**: vê e gerencia apenas os próprios links.

Roles em tabela separada `user_roles` (`admin` | `funcionario`) + função `has_role()` (segurança).

## Telas

1. `/auth` — login único (admin e funcionário)
2. `/dashboard` — lista de links
   - Admin vê todos, com filtro por funcionário e totais consolidados
   - Funcionário vê só os seus
3. `/links/new` — criar link (URL destino, nome, plataforma)
4. `/links/$slug` — analytics do link (total, únicos, gráfico diário, referrers, entradas confirmadas)
5. `/team` (admin) — gestão de funcionários (criar, ativar/desativar, excluir)
6. `/settings/bots` (admin) — instruções para configurar os bots do Telegram/Discord e URLs dos webhooks
7. `/r/$slug` — página pública de redirecionamento que registra o clique e redireciona

## Regra do slug

Gerado automaticamente no backend: `nanoid(5)` + `-web3brasil`. Usuário não edita.

## Modelo de dados (Supabase)

- `profiles(id, nome, email, login, ativo, criado_em)` — 1:1 com `auth.users`
- `user_roles(user_id, role)` — enum `app_role`
- `links(id, user_id, slug UNIQUE, destino_url, nome, plataforma, criado_em)`
- `clicks(id, link_id, timestamp, ip_hash, user_agent, referrer)`
- `group_joins(id, link_id, timestamp, platform_user_id, platform)`

RLS:
- Funcionário: `user_id = auth.uid()` nos links e leitura de clicks/joins só dos próprios links
- Admin (`has_role`): acesso total
- `/r/$slug` e webhooks rodam via server functions com service role

## Analytics

- Total de cliques (count)
- Únicos: `count(distinct ip_hash)` (SHA-256 do IP+UA como fingerprint)
- Série diária: agregação por `date_trunc('day', timestamp)`
- Referrers: top-N
- Entradas confirmadas: count em `group_joins` (WhatsApp mostra "estimativa por cliques")

Gráficos com `recharts`.

## Fluxo de redirecionamento

Rota pública `/r/$slug`:
1. Server function busca link pelo slug
2. Insere registro em `clicks` (hash do IP via `x-forwarded-for`, UA, referrer)
3. Redireciona para `destino_url`

## Webhooks (rotas públicas)

- `POST /api/public/webhooks/telegram/$slug` — recebe `new_chat_members`, insere em `group_joins`
- `POST /api/public/webhooks/discord/$slug` — recebe `guildMemberAdd`
- Autenticados por secret token no path/header (documentado na tela de bots)

WhatsApp: sem webhook — mostra apenas cliques como proxy.

## Criação de funcionários (admin)

Server function com `requireSupabaseAuth` + verificação `has_role('admin')`:
- Usa `supabaseAdmin.auth.admin.createUser({ email, password })`
- Cria linha em `profiles` e `user_roles`
- Ativar/desativar: flag `ativo` em `profiles` + `beforeLoad` bloqueia login inativo
- Excluir: `supabaseAdmin.auth.admin.deleteUser`

## Design

Tema escuro/profissional (SaaS analytics). Sidebar com navegação. Tokens semânticos em `src/styles.css` (roxo/azul discreto, não o purple genérico — usar tons próximos de teal/indigo escuro). Cards, tabelas e gráficos com o mesmo sistema.

## Estrutura de rotas

```text
src/routes/
├── __root.tsx
├── index.tsx                 → redireciona para /dashboard ou /auth
├── auth.tsx                  → login
├── r.$slug.tsx               → redirect público + registro de clique
├── api/public/webhooks/
│   ├── telegram.$slug.ts
│   └── discord.$slug.ts
└── _authenticated/
    ├── route.tsx             (gerenciado)
    ├── dashboard.tsx
    ├── links.new.tsx
    ├── links.$slug.tsx
    ├── team.tsx              (só admin, redirect se não)
    └── settings.bots.tsx     (só admin)
```

## Passos de implementação

1. Habilitar Lovable Cloud
2. Migração: enum `app_role`, tabelas + RLS + grants + função `has_role`
3. Design system em `styles.css`
4. Server functions: `createLink`, `getMyLinks`, `getAllLinks` (admin), `getLinkAnalytics`, `createEmployee`, `toggleEmployee`, `deleteEmployee`, `listEmployees`
5. Rota `/r/$slug` (server route) — registra clique + redireciona
6. Webhooks Telegram/Discord
7. Telas: auth, dashboard, criar link, analytics, team, bots
8. Sitemap/robots

## Perguntas rápidas antes de começar

Nenhuma bloqueadora — vou seguir com:
- Login por **email + senha** (o campo "login" fica igual ao email para simplificar; se quiser login separado do email, avise)
- Domínio dos links curtos = domínio da própria app (`/r/{slug}-web3brasil`)
- Tema **escuro** por padrão

Se quiser mudar algo aí, me avise; caso contrário aprovo e implemento.

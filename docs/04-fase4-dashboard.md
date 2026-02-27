# Fase 4: Dashboard Web (Next.js)

## Visao Geral

O Dashboard e a interface web do OpenLog, construida com Next.js App Router. Ele le dados diretamente do PostgreSQL (via Prisma) e exibe logs, diagnosticos e metricas.

---

## Decisao Arquitetural: BFF (Backend for Frontend)

O Dashboard **nao** chama a API Go para ler dados. Em vez disso, ele conecta diretamente no PostgreSQL usando Prisma ORM.

### Por que?

1. **Separacao de responsabilidades**: o servico Go e otimizado para escrita de alta performance (receber logs). Adicionar endpoints de leitura para dashboard misturaria responsabilidades.

2. **Escalabilidade independente**: em producao, reads e writes escalam de forma diferente. O dashboard leria de uma read replica, enquanto o Go escreve no primario.

3. **Server Components**: Next.js executa Server Components no servidor. A conexao com o banco nunca e exposta ao browser. O HTML renderizado e o que chega ao cliente.

### CQRS-Lite

O projeto segue um padrao CQRS simplificado:
- **Writes** (Command): Cliente -> Go API -> PostgreSQL + RabbitMQ
- **Reads** (Query): Browser -> Next.js Server Components -> Prisma -> PostgreSQL

---

## Server Components vs Client Components

O Next.js App Router diferencia dois tipos de componentes:

### Server Components (padrao)
- Executam **apenas no servidor**
- Podem acessar banco de dados diretamente
- Nao enviam JavaScript para o browser
- Usados em: paginas, layouts, data fetching

### Client Components (`"use client"`)
- Executam no browser
- Necessarios para interatividade (useState, useEffect, onClick)
- Usados em: filtros, graficos (Recharts), navegacao mobile

No dashboard, as **paginas** sao Server Components que buscam dados no banco. Os **graficos** e **filtros** sao Client Components que recebem dados via props.

---

## Prisma 7 -- Mudancas Importantes

O Prisma 7 trouxe mudancas significativas em relacao ao v6:

1. **Driver Adapter obrigatorio**: `new PrismaClient()` sem argumentos nao funciona mais. E necessario passar um adapter (`@prisma/adapter-pg`).

2. **URL no prisma.config.ts**: a `url` no `datasource` do schema.prisma foi removida. A conexao e configurada no `prisma.config.ts`.

3. **Introspeccao**: `prisma db pull` le o banco existente e gera o schema automaticamente. Util quando o banco ja existe (como no nosso caso, criado pelas migrations do dbmate).

---

## Stack Tecnologica

| Tecnologia | Motivo |
|---|---|
| Next.js 16 (App Router) | Server Components, streaming, layouts aninhados |
| TypeScript | Type-safety ponta a ponta com tipos gerados pelo Prisma |
| Tailwind CSS v4 | Utility-first, consistente, sem CSS custom |
| shadcn/ui | Componentes acessiveis (Radix UI), codigo no projeto (nao e lib) |
| Prisma 7 | ORM type-safe, introspeccao do banco existente |
| Recharts | Graficos React composable (PieChart, BarChart, LineChart) |

---

## Paginas

| Rota | Descricao |
|---|---|
| `/` | Dashboard overview: cards de severidade, graficos, diagnosticos recentes |
| `/logs` | Tabela paginada com filtros por level, busca por mensagem |
| `/logs/[id]` | Detalhe do log + diagnostico da IA |
| `/analytics` | Graficos de volume, distribuicao por source, top erros |

---

## Dockerfile Multi-stage

O Dockerfile usa 4 stages para otimizar a imagem:

1. **base**: Node.js 20 Alpine
2. **deps**: Instala dependencias de producao
3. **builder**: Instala todas as deps, gera Prisma client, faz build do Next.js
4. **runner**: Copia apenas o output standalone (~100MB vs ~1GB)

O Next.js `output: "standalone"` gera um servidor Node.js minimo que nao precisa de `node_modules`.

---

## Acesso Local

Apos `docker compose up -d`:
- Dashboard: http://localhost:3000
- API (Go): http://localhost:8080
- RabbitMQ Management: http://localhost:15672

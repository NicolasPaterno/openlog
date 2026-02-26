# OpenLog - IA-Ops Log Analyzer

SaaS de observabilidade que usa inteligencia artificial para analisar logs em tempo real, identificar padroes de erro e gerar diagnosticos automaticos.

## Arquitetura

```
Cliente --> [Ingestion API (Go)] --> [RabbitMQ] --> [AI Worker (Python)] --> [PostgreSQL]
                    |                                       |
                    +--------> [PostgreSQL]                 +--------> [Redis]
```

| Servico          | Linguagem | Responsabilidade                                    |
| ---------------- | --------- | --------------------------------------------------- |
| **Ingestion**    | Go        | API de alta performance para receber logs via JSON   |
| **AI Worker**    | Python    | Consome fila, analisa logs com LangChain/OpenAI      |
| **PostgreSQL**   | -         | Persistencia de logs brutos e diagnosticos           |
| **RabbitMQ**     | -         | Mensageria para desacoplar ingestao do processamento |
| **Redis**        | -         | Cache e rate limiting                                |

## Pre-requisitos

- [Docker](https://docs.docker.com/get-docker/) >= 24.0
- [Docker Compose](https://docs.docker.com/compose/install/) >= 2.20
- [Go](https://go.dev/dl/) >= 1.22 (para desenvolvimento local do servico de ingestao)
- [Python](https://www.python.org/downloads/) >= 3.11 (para desenvolvimento local do AI Worker)
- [Make](https://www.gnu.org/software/make/) (opcional, mas recomendado)

## Quick Start

```bash
# 1. Clone o repositorio
git clone https://github.com/seu-usuario/openlog.git
cd openlog

# 2. Configure as variaveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais (especialmente OPENAI_API_KEY)

# 3. Suba a infraestrutura
make up

# 4. Verifique se tudo esta rodando
make ps

# 5. Acompanhe os logs
make logs
```

## Comandos Uteis

| Comando        | Descricao                                 |
| -------------- | ----------------------------------------- |
| `make up`      | Sobe todos os servicos de infra           |
| `make down`    | Para todos os containers                  |
| `make restart` | Reinicia todos os containers              |
| `make logs`    | Acompanha logs em tempo real              |
| `make ps`      | Lista status dos containers               |
| `make health`  | Mostra o health status de cada container  |
| `make clean`   | Remove containers, volumes e imagens orfas|
| `make help`    | Lista todos os comandos disponiveis       |

## Acessos Locais (Desenvolvimento)

| Servico            | URL                          | Credenciais padrão         |
| ------------------ | ---------------------------- | -------------------------- |
| RabbitMQ Dashboard | http://localhost:15672        | openlog / openlog_secret   |
| PostgreSQL         | localhost:5432                | openlog / openlog_secret   |
| Redis              | localhost:6379                | password: openlog_secret   |

## Estrutura do Projeto

```
openlog/
├── .github/workflows/   # CI/CD (GitHub Actions)
├── services/
│   ├── ingestion/       # API Go de alta performance
│   │   ├── cmd/server/  # Entrypoint
│   │   ├── internal/    # Logica interna (handlers, queue, config, models)
│   │   └── db/queries/  # Queries SQL (sqlc)
│   └── ai-worker/       # Worker Python com IA
│       └── src/         # Consumer, analyzer, db, config
├── migrations/sql/      # Migrations SQL versionadas
├── scripts/             # Scripts auxiliares
├── infra/docker/        # Configs Docker extras
├── docs/                # Documentacao tecnica e decisoes de arquitetura
├── docker-compose.yml   # Orquestracao da stack
├── Makefile             # Atalhos de desenvolvimento
└── .env.example         # Template de variaveis de ambiente
```

## Documentacao

A pasta `docs/` contem material educacional sobre as decisoes de arquitetura, conceitos e diagramas do projeto. Consulte-a para entender o "porque" de cada escolha tecnica.

## Licenca

MIT

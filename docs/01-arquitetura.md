# Arquitetura do OpenLog

## Visao Geral

O OpenLog segue uma arquitetura orientada a eventos (event-driven) com dois servicos principais desacoplados por uma fila de mensagens.

```
                         Rede Docker: backend
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  ┌────────────┐    ┌───────────┐    ┌───────────────────┐   │
  │  │ Ingestion  │───>│ RabbitMQ  │───>│    AI Worker      │   │
  │  │   (Go)     │    │           │    │    (Python)        │   │
  │  └─────┬──────┘    └───────────┘    └──────┬────────────┘   │
  │        │                                   │     │          │
  │        v                                   v     v          │
  │  ┌────────────┐                     ┌──────────┐            │
  │  │ PostgreSQL │<────────────────────│  Redis   │            │
  │  └────────────┘                     └──────────┘            │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

## Decisoes Tecnicas

### Por que Go para Ingestao?

- **Goroutines**: cada request HTTP e tratada numa goroutine (~2KB de stack vs ~1MB por thread em Java/Python). 100k conexoes simultaneas com pouca RAM.
- **Binario estatico**: container Docker final com ~10-15MB (Alpine + binario). Sem runtime, sem dependencias.
- **net/http nativo**: servidor HTTP production-ready na stdlib.
- **GC otimizado para baixa latencia**: pausas abaixo de 1ms desde Go 1.8.

### Por que Python para o AI Worker?

- **Ecossistema de IA maduro**: LangChain, OpenAI SDK, tiktoken sao Python-first.
- **Bottleneck e I/O, nao CPU**: o worker espera ~1-3s por chamada a OpenAI. A diferenca de performance entre linguagens e irrelevante aqui.
- **Iteracao rapida**: prompts mudam constantemente. Python permite testar em REPL sem recompilar.

### Por que dois servicos separados (mesmo que pudessem ser na mesma linguagem)?

1. **Escalabilidade independente**: na Black Friday, escala 10x a ingestao sem escalar o worker de IA.
2. **Isolamento de falhas (Bulkhead Pattern)**: se a OpenAI cai, o worker para mas a ingestao continua recebendo logs na fila.
3. **Ciclos de deploy independentes**: mudar um prompt nao exige re-deploy da API de ingestao.

### Por que RabbitMQ em vez de chamada HTTP direta?

- **Desacoplamento temporal**: o producer nao precisa saber se o consumer esta online.
- **Buffer natural**: se o worker nao consegue processar rapido o suficiente, as mensagens acumulam na fila em vez de causar timeout.
- **Retry nativo**: mensagens com falha podem ser re-enfileiradas ou enviadas para uma dead-letter queue.
- **Fan-out futuro**: se amanha quisermos adicionar um segundo consumer (ex: alertas), basta criar outra fila.

### Por que sqlc em vez de GORM?

- **SQL puro**: aprende-se a skill mais transferivel que existe em backend.
- **Zero reflection**: performance proxima do driver puro (pgx).
- **Type-safe em compile time**: se o SQL tiver erro, nao compila.
- **Queries auditaveis**: qualquer dev ou DBA le os .sql e entende o que o servico faz.

## Healthchecks - Estrategia em Duas Camadas

### Camada 1: Docker Healthchecks (infra)

Cada servico de infra declara um healthcheck que testa funcionalidade real:

| Servico    | Comando                                        | Motivo                                       |
| ---------- | ---------------------------------------------- | -------------------------------------------- |
| PostgreSQL | pg_isready                                     | Verifica conexoes TCP, nao apenas o processo  |
| RabbitMQ   | rabbitmq-diagnostics check_port_connectivity   | Testa portas AMQP + management               |
| Redis      | redis-cli ping                                 | PONG so retorna se esta processando comandos  |

Os servicos Go/Python usam `depends_on` com `condition: service_healthy`.

### Camada 2: Retry com Exponential Backoff (aplicacao)

Healthchecks cobrem a inicializacao. Em producao, conexoes podem cair a qualquer momento. Os servicos implementam retry com backoff exponencial (1s, 2s, 4s, 8s...).

## Docker - Networks vs Volumes

- **Networks** conectam containers entre si (comunicacao). Criam DNS interno (ex: `rabbitmq:5672`).
- **Volumes** conectam containers ao disco (persistencia). Sem volume, `docker compose down` perde todos os dados.

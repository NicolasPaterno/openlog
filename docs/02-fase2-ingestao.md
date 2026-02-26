# Fase 2: Servico de Ingestao (Go)

## Visao Geral

O servico de ingestao e uma API HTTP escrita em Go com o framework Gin. Sua responsabilidade e:

1. Receber logs via POST JSON
2. Validar o payload
3. Persistir o log bruto no PostgreSQL (via sqlc)
4. Publicar uma mensagem no RabbitMQ para processamento assincrono pelo AI Worker

## Contrato da API

### POST /api/v1/logs

Cria um novo log e enfileira para analise.

**Request:**

```json
{
  "source": "api-gateway",
  "level": "ERROR",
  "message": "Connection timeout to upstream service",
  "metadata": {
    "service": "auth",
    "latency_ms": 5200,
    "trace_id": "abc-123"
  }
}
```

| Campo      | Tipo   | Obrigatorio | Valores aceitos                         |
| ---------- | ------ | ----------- | --------------------------------------- |
| `source`   | string | sim         | Qualquer string (max 255 chars)         |
| `level`    | string | sim         | DEBUG, INFO, WARN, ERROR, FATAL         |
| `message`  | string | sim         | Texto livre                             |
| `metadata` | object | nao         | JSON arbitrario (armazenado como JSONB) |

**Response (201 Created):**

```json
{
  "id": 1,
  "source": "api-gateway",
  "level": "ERROR",
  "message": "Connection timeout to upstream service",
  "metadata": {
    "service": "auth",
    "latency_ms": 5200,
    "trace_id": "abc-123"
  },
  "created_at": "2026-02-26T10:30:00Z"
}
```

**Response (400 Bad Request):**

```json
{
  "error": "invalid request body",
  "details": "Key: 'CreateLogRequest.Level' Error:Field validation for 'Level' failed on the 'oneof' tag"
}
```

### GET /api/v1/logs/:id

Retorna um log pelo ID.

**Response (200 OK):** Mesmo formato do POST.

**Response (404 Not Found):**

```json
{
  "error": "log not found"
}
```

### GET /api/v1/logs?limit=20&offset=0

Lista logs com paginacao.

**Query Params:**

| Param    | Default | Max |
| -------- | ------- | --- |
| `limit`  | 20      | 100 |
| `offset` | 0       | -   |

**Response (200 OK):**

```json
{
  "data": [
    { "id": 2, "source": "...", "level": "...", "message": "...", "metadata": {}, "created_at": "..." },
    { "id": 1, "source": "...", "level": "...", "message": "...", "metadata": {}, "created_at": "..." }
  ],
  "limit": 20,
  "offset": 0
}
```

### GET /health

Health check do servico.

**Response (200 OK):**

```json
{
  "status": "healthy",
  "service": "ingestion"
}
```

## Decisoes Tecnicas

### Por que sqlc e nao GORM

- O servico faz ~3 queries (insert, get by id, list). Um ORM completo e desproporcional.
- sqlc gera codigo type-safe em compile time, sem reflection em runtime.
- As queries sao SQL puro, auditaveis por qualquer DBA.
- Performance proxima do driver puro (pgx), sem overhead de ORM.

### Multi-stage Build do Docker

O Dockerfile usa dois estagios:

1. **Build stage** (`golang:1.22-alpine`): compila o codigo Go em um binario estatico.
   - `CGO_ENABLED=0`: sem dependencia de C, binario 100% estatico.
   - `-ldflags="-s -w"`: remove simbolos de debug, reduz tamanho do binario.
2. **Runtime stage** (`alpine:3.19`): apenas o binario + certificados CA.
   - Resultado: imagem de ~15MB vs ~1GB da imagem golang.

### Retry com Exponential Backoff (RabbitMQ)

A conexao com o RabbitMQ usa retry com backoff exponencial:

```
Tentativa 1: espera 1s
Tentativa 2: espera 2s
Tentativa 3: espera 4s
Tentativa 4: espera 8s
Tentativa 5: espera 16s (maximo)
```

Isso cobre dois cenarios:
- **Inicializacao**: o RabbitMQ pode nao estar pronto ainda (Erlang VM demora ~15-20s).
- **Producao**: se o broker cair temporariamente, o servico tenta reconectar.

### Graceful Shutdown

O servico captura SIGINT/SIGTERM e faz shutdown gracioso:
1. Para de aceitar novas conexoes
2. Aguarda requests em andamento terminarem (timeout de 5s)
3. Fecha conexoes com PostgreSQL e RabbitMQ
4. Sai com codigo 0

Isso e fundamental para deploys sem downtime (rolling updates no Kubernetes/Docker Swarm).

## Mensagem na Fila

Quando um log e criado, o servico publica a seguinte mensagem na fila `logs.analyze`:

```json
{
  "log_id": 1,
  "source": "api-gateway",
  "level": "ERROR",
  "message": "Connection timeout to upstream service"
}
```

O AI Worker consome essa fila, faz a analise com LangChain/OpenAI, e salva o diagnostico na tabela `diagnostics`.

## Migrations (dbmate)

As migrations ficam em `migrations/sql/` e sao executadas pelo servico `migrate` no docker-compose (antes do servico de ingestao iniciar).

Para rodar manualmente: `make migrate-up`
Para reverter: `make migrate-down`
Para ver status: `make migrate-status`

# Fase 3: AI Worker (Python)

## Visao Geral

O AI Worker e um servico Python que:
1. Consome mensagens da fila `logs.analyze` no RabbitMQ
2. Busca o log completo no PostgreSQL (incluindo metadata)
3. Envia o log para um LLM (Ollama local ou OpenAI) via LangChain
4. Salva o diagnostico estruturado na tabela `diagnostics`

---

## Por que LangChain?

A escolha do LangChain nao e por ser "framework da moda", mas por um motivo arquitetural concreto: **abstraction over providers**.

O mesmo codigo funciona com:
- **Ollama** (local, gratuito) via `ChatOllama`
- **OpenAI** (cloud, pago) via `ChatOpenAI`

A troca acontece apenas via variavel de ambiente (`LLM_PROVIDER`), sem alterar uma linha de codigo. Isso segue o principio de **Open/Closed** — aberto para extensao (novos providers), fechado para modificacao.

Alem disso, o LangChain oferece:
- **Prompt Templates** — reutilizaveis e parametrizados
- **Output Parsers** — valida que o LLM retornou JSON valido
- **Chain composition** — `prompt | llm | parser` e uma pipeline declarativa

## Ollama vs OpenAI

| Aspecto | Ollama (local) | OpenAI (cloud) |
|---|---|---|
| Custo | Gratuito | Pago por token |
| Latencia | Depende do hardware | ~1-3s |
| Privacidade | Dados nunca saem da maquina | Dados vao para API externa |
| Modelos | llama3.2, mistral, etc | GPT-4o, GPT-3.5 |
| Setup | `ollama pull <modelo>` | API key |
| Uso ideal | Desenvolvimento, testes | Producao com budget |

Para desenvolvimento local, o Ollama e perfeito — roda dentro do Docker via um container dedicado.

## Padrao ACK/NACK no RabbitMQ

O consumer implementa um padrao robusto de acknowledge:

```
Mensagem recebida
    |
    v
Processa (busca log, roda IA, salva)
    |
    +-- Sucesso --> ACK (mensagem removida da fila)
    |
    +-- Erro temporario --> NACK + requeue (volta para fila)
    |
    +-- Erro permanente (JSON invalido, log nao existe) --> ACK (descarta)
```

**Por que ACK manual (e nao auto-ack)?**

Com `auto_ack=True`, a mensagem e removida da fila assim que e entregue ao consumer. Se o processo crashar durante o processamento, a mensagem e perdida para sempre.

Com ACK manual:
- A mensagem fica "invisible" para outros consumers (nao e reprocessada em paralelo)
- Se o consumer crashar antes do ACK, o RabbitMQ devolve a mensagem para a fila automaticamente
- Garantimos **at-least-once delivery** — pode haver duplicatas, mas nunca perda

**NACK com requeue** — quando o processamento falha por erro temporario (ex: Ollama fora do ar), a mensagem volta para o final da fila. Um `time.sleep(5)` evita retry imediato que sobrecarregaria o sistema.

## Troca de Provider

Para mudar de Ollama para OpenAI:

```bash
# .env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o
OPENAI_API_KEY=sk-...
```

Restart do container:
```bash
docker compose restart ai-worker
```

Nenhum codigo precisa mudar. A class `LogAnalyzerChain` instancia o LLM correto baseado na config.

## Estrutura de Diretorios

```
services/ai-worker/
├── src/
│   ├── __init__.py
│   ├── main.py              # Bootstrap: config -> repo -> chain -> consumer
│   ├── config.py             # pydantic-settings: env vars tipadas
│   ├── consumer/
│   │   ├── __init__.py
│   │   └── worker.py         # RabbitMQ consumer com ACK/NACK
│   ├── analyzer/
│   │   ├── __init__.py
│   │   └── chain.py          # LangChain: prompt | llm | parser
│   └── db/
│       ├── __init__.py
│       └── repository.py     # psycopg2: get_log, insert_diagnostic
├── Dockerfile                # python:3.11-slim
├── requirements.txt
└── pyproject.toml
```

## Primeiro Teste End-to-End

```bash
# 1. Subir tudo
docker compose up -d

# 2. Baixar modelo no Ollama (primeira vez, ~2GB)
docker exec -it openlog-ollama ollama pull llama3.2

# 3. Enviar um log
curl -X POST http://localhost:8080/api/v1/logs \
  -H "Content-Type: application/json" \
  -d '{"source":"api-gateway","level":"ERROR","message":"Connection timeout to upstream service","metadata":{"latency_ms":5200}}'

# 4. Verificar o diagnostico (apos alguns segundos)
docker exec -it openlog-postgres psql -U openlog -d openlog \
  -c "SELECT d.summary, d.severity, d.suggestion FROM diagnostics d JOIN logs l ON d.log_id = l.id ORDER BY d.created_at DESC LIMIT 1;"
```

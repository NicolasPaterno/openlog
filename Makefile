.PHONY: up down logs ps restart health clean build logs-worker ollama-pull

## ---------- Infra ----------

up: ## Sobe todos os servicos (infra + aplicacao)
	docker compose up -d

up-infra: ## Sobe apenas infra (postgres, rabbitmq, redis)
	docker compose up -d postgres rabbitmq redis

down: ## Para todos os containers
	docker compose down

restart: ## Reinicia todos os containers
	docker compose restart

logs: ## Acompanha logs em tempo real
	docker compose logs -f

ps: ## Lista status dos containers
	docker compose ps

health: ## Mostra o health status de cada container
	docker compose ps --format "table {{.Name}}\t{{.Status}}"

clean: ## Remove containers, volumes e imagens orfas
	docker compose down -v --remove-orphans

build: ## Rebuild das imagens dos servicos
	docker compose build

## ---------- Database ----------

migrate-up: ## Executa migrations pendentes via Docker
	docker compose run --rm migrate

migrate-down: ## Reverte a ultima migration via Docker
	docker compose run --rm migrate down

migrate-status: ## Mostra status das migrations
	docker compose run --rm migrate status

## ---------- Ingestion ----------

logs-ingestion: ## Logs apenas do servico de ingestao
	docker compose logs -f ingestion

## ---------- AI Worker ----------

logs-worker: ## Logs apenas do AI Worker
	docker compose logs -f ai-worker

ollama-pull: ## Baixa modelo no Ollama (ex: make ollama-pull MODEL=llama3.2)
	docker exec -it openlog-ollama ollama pull $(or $(MODEL),llama3.2)

## ---------- Help ----------

help: ## Mostra esta ajuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

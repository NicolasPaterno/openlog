.PHONY: up down logs ps restart health clean

## ---------- Infra ----------

up: ## Sobe todos os servicos de infra
	docker compose up -d

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

## ---------- Database ----------

migrate-up: ## Executa migrations pendentes
	@echo "TODO: implementar na proxima fase"

migrate-down: ## Reverte a ultima migration
	@echo "TODO: implementar na proxima fase"

## ---------- Help ----------

help: ## Mostra esta ajuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

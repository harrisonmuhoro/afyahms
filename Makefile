.PHONY: help up down restart build logs ps shell artisan composer test lint format migrate seed fresh queue horizon reverb scheduler install-local composer-local artisan-local test-local migrate-local seed-local fresh-local

# Default target
.DEFAULT_GOAL := help

# Detect docker compose command
DC := $(shell command -v docker-compose >/dev/null 2>&1 && echo "docker-compose" || echo "docker compose")

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ----------------------------------------------------------------------
# Docker / environment
# ----------------------------------------------------------------------

up: ## Start all containers in the background
	$(DC) up -d

down: ## Stop all containers
	$(DC) down

restart: ## Restart all containers
	$(DC) restart

build: ## Build all images
	$(DC) build

logs: ## Tail logs (all services)
	$(DC) logs -f

ps: ## List running containers
	$(DC) ps

shell: ## Open a shell in the backend container
	$(DC) exec backend sh

# ----------------------------------------------------------------------
# Backend convenience
# ----------------------------------------------------------------------

artisan: ## Run an artisan command: make artisan cmd="migrate"
	$(DC) exec backend php artisan $(cmd)

composer: ## Run composer: make composer cmd="require foo/bar"
	$(DC) exec backend composer $(cmd)

migrate: ## Run database migrations
	$(DC) exec backend php artisan migrate

seed: ## Run database seeders
	$(DC) exec backend php artisan db:seed

fresh: ## Drop, recreate, migrate, and seed
	$(DC) exec backend php artisan migrate:fresh --seed

queue: ## Run a one-shot queue worker
	$(DC) exec backend php artisan queue:work --once

horizon: ## Open Horizon dashboard info
	$(DC) exec backend php artisan horizon

reverb: ## Start Reverb WebSocket server (foreground)
	$(DC) exec backend php artisan reverb:start

scheduler: ## Trigger the scheduler once
	$(DC) exec backend php artisan schedule:run

# ----------------------------------------------------------------------
# Quality
# ----------------------------------------------------------------------

test: ## Run backend tests
	$(DC) exec backend php artisan test

lint: ## Run pint (backend) and eslint (frontend)
	$(DC) exec backend ./vendor/bin/pint --test
	cd frontend && npm run lint

format: ## Auto-format backend (pint) and frontend (prettier)
	$(DC) exec backend ./vendor/bin/pint
	cd frontend && npm run format

# ----------------------------------------------------------------------
# Local (WAMP) development — no Docker
# ----------------------------------------------------------------------

# Path to WAMP's PHP 8.3 binary
PHP ?= D:\wamp\bin\php\php8.3.28\php.exe
COMPOSER ?= D:\wamp\bin\php\php8.3.28\composer.phar

install-local: ## Swap to composer.local.json and run install (WAMP)
	@if not exist backend\composer.local.json (echo. & echo composer.local.json missing & exit /b 1)
	copy /Y backend\composer.json backend\composer.prod.json
	copy /Y backend\composer.local.json backend\composer.json
	cd backend && $(PHP) $(COMPOSER) install --no-interaction --no-progress
	@echo Local install complete. Run `make migrate-local`.

composer-local: ## composer in local mode: make composer-local cmd="require foo/bar"
	copy /Y backend\composer.prod.json backend\composer.json >nul 2>&1 || copy /Y backend\composer.local.json backend\composer.json
	cd backend && $(PHP) $(COMPOSER) $(cmd)
	copy /Y backend\composer.local.json backend\composer.json >nul 2>&1

artisan-local: ## Run an artisan command locally: make artisan-local cmd="migrate"
	cd backend && $(PHP) artisan $(cmd)

migrate-local: ## Run migrations on local DB
	cd backend && $(PHP) artisan migrate

seed-local: ## Run seeders on local DB
	cd backend && $(PHP) artisan db:seed

fresh-local: ## Drop, recreate, migrate, and seed on local DB
	cd backend && $(PHP) artisan migrate:fresh --seed

test-local: ## Run backend tests locally
	cd backend && $(PHP) artisan test
.PHONY: up down logs restart setup-claude

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

restart:
	docker compose restart invman

setup-claude:
	bash scripts/setup-claude.sh

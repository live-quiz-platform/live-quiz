
MIGRATE := $(HOME)/go/bin/migrate
ENV_FILE := ../../.env
MIGRATIONS_DIR := migrations

.PHONY: migrate-up migrate-down migrate-version

define run-migration
	@set -euo pipefail; \
	source "$(ENV_FILE)"; \
	: "$${POSTGRES_HOST:?Missing POSTGRES_HOST}"; \
	: "$${POSTGRES_DB_PORT:?Missing POSTGRES_DB_PORT}"; \
	: "$${POSTGRES_USER_IDENTITY:?Missing POSTGRES_USER_IDENTITY}"; \
	: "$${IDENTITY_DB_PASSWORD:?Missing IDENTITY_DB_PASSWORD}"; \
	: "$${POSTGRES_IDENTITY_DB:?Missing POSTGRES_IDENTITY_DB}"; \
	: "$${POSTGRES_SSL_MODE:?Missing POSTGRES_SSL_MODE}"; \
	DATABASE_URL="postgres://$${POSTGRES_USER_IDENTITY}:$${IDENTITY_DB_PASSWORD}@$${POSTGRES_HOST}:$${POSTGRES_DB_PORT}/$${POSTGRES_IDENTITY_DB}?sslmode=$${POSTGRES_SSL_MODE}"; \
	"$(MIGRATE)" -path "$(MIGRATIONS_DIR)" -database "$$DATABASE_URL" $(1)
endef

migrate-up:
	$(call run-migration,up)

migrate-down:
	$(call run-migration,down 1)

migrate-version:
	$(call run-migration,version)

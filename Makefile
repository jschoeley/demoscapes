.DEFAULT_GOAL := help

WEBSITE_API_PROXY_TARGET ?= http://127.0.0.1:3000
WEBSITE_DEV_PORT ?= 8090
DEPLOY_USER ?= deploy
DEPLOY_HOST ?= demoscapes
DEPLOY_APP_DIR ?= /opt/demoscapes/app
DEPLOY_ENV_FILE ?= /opt/demoscapes/env/demoscapes.env
DEPLOY_SSH_TARGET := $(DEPLOY_USER)@$(DEPLOY_HOST)
DEPLOY_SSH := ssh $(DEPLOY_SSH_TARGET)
DEPLOY_RSYNC := rsync -az --delete \
	--exclude '.git/' \
	--exclude '.env' \
	--exclude 'node_modules/' \
	--exclude 'website/dist/' \
	--exclude 'dataprep/' \
	--exclude 'pvt/'
COMPOSE_BASE := docker compose -f docker-compose.yml
COMPOSE_DEV_API := docker compose -f docker-compose.yml -f docker-compose.dev.yml
RSCRIPT ?= Rscript
DATAPREP_DIR := dataprep
ACQUISITION_SOURCES := $(sort $(basename $(notdir $(wildcard $(DATAPREP_DIR)/src/data_acquisition/*.R))))
SERIES_KEYS := $(sort $(basename $(notdir $(wildcard $(DATAPREP_DIR)/src/series_creation/*.R))))
SOURCES ?= $(ACQUISITION_SOURCES)
SERIES ?= $(SERIES_KEYS)

# Run the R scripts named in $(1) from directory $(2) inside dataprep/. Every
# script runs even if an earlier one fails; failures are listed at the end.
define run_r_scripts
@failed=''; \
for name in $(1); do \
	script="src/$(2)/$$name.R"; \
	if [ ! -f "$(DATAPREP_DIR)/$$script" ]; then \
		printf '== %s: no such script %s\n' "$$name" "$$script" >&2; failed="$$failed $$name"; continue; \
	fi; \
	printf '== %s\n' "$$name"; \
	(cd $(DATAPREP_DIR) && $(RSCRIPT) "$$script") || failed="$$failed $$name"; \
done; \
if [ -n "$$failed" ]; then printf 'Failed:%s\n' "$$failed" >&2; exit 1; fi
endef

.PHONY: help build run smoke-website dev-api dev-website data-acquisition series-creation dataprep deploy-sync deploy update stop clean guard-deploy-host

help:
	@printf "Available targets:\n"
	@printf "  make build  Build all Docker images using the production-safe Compose config\n"
	@printf "  make run    Start the Docker Compose stack in detached mode without publishing the API port\n"
	@printf "  make smoke-website  Start the full stack locally with the production-style Caddy website using the default Compose ports\n"
	@printf "  make dev-api  Start database, db-init, and api with the dev override that publishes the API on 127.0.0.1:3000\n"
	@printf "  make dev-website  Start the local website dev server with live reload and /api proxy\n"
	@printf "  make data-acquisition [SOURCES=\"hmd hfd\"]  Download and preformat source data into dataprep/dat (all sources by default)\n"
	@printf "  make series-creation [SERIES=<series key>]  Create, validate, and export series into dataprep/out/series_creation (all series by default)\n"
	@printf "  make dataprep  Run data-acquisition, then series-creation\n"
	@printf "  make deploy-sync DEPLOY_HOST=<host>  Rsync the deployment tree, including database/import data, to the server\n"
	@printf "  make deploy DEPLOY_HOST=<host>  Sync code and perform a fresh production rollout on the server\n"
	@printf "  make update DEPLOY_HOST=<host>  Alias for deploy; updates also resync database/import data and recreate the stack\n"
	@printf "  make stop   Stop and remove the Docker Compose stack\n"
	@printf "  make clean  Remove the Docker Compose stack and local images\n"

build:
	$(COMPOSE_BASE) build

run:
	$(COMPOSE_BASE) up -d

smoke-website:
	ACME_EMAIL=local@localhost \
	CADDY_CONFIG_PATH=/etc/caddy/Caddyfile.local \
	$(COMPOSE_BASE) up -d

dev-api:
	$(COMPOSE_DEV_API) up -d database db-init api

dev-website:
	WEBSITE_API_PROXY_TARGET=$(WEBSITE_API_PROXY_TARGET) WEBSITE_DEV_PORT=$(WEBSITE_DEV_PORT) npm run dev:website

data-acquisition:
	$(call run_r_scripts,$(SOURCES),data_acquisition)

series-creation:
	$(call run_r_scripts,$(SERIES),series_creation)

dataprep:
	$(MAKE) data-acquisition
	$(MAKE) series-creation

guard-deploy-host:
	@test -n "$(DEPLOY_HOST)" || (printf "DEPLOY_HOST is required, for example: make deploy DEPLOY_HOST=demoscapes.org\n" >&2; exit 1)

deploy-sync: guard-deploy-host
	$(DEPLOY_SSH) "mkdir -p $(DEPLOY_APP_DIR)"
	$(DEPLOY_RSYNC) ./ $(DEPLOY_SSH_TARGET):$(DEPLOY_APP_DIR)/

deploy: guard-deploy-host deploy-sync
	$(DEPLOY_SSH) "bash -lc 'cd $(DEPLOY_APP_DIR) && set -a && . $(DEPLOY_ENV_FILE) && set +a && docker compose down --remove-orphans && docker compose build && docker compose up -d --remove-orphans && docker compose ps'"

update: deploy

stop:
	$(COMPOSE_DEV_API) down

clean:
	$(COMPOSE_DEV_API) down --rmi local

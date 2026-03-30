.DEFAULT_GOAL := help

WEBSITE_API_PROXY_TARGET ?= http://127.0.0.1:3000
WEBSITE_DEV_PORT ?= 8090
COMPOSE_BASE := docker compose -f docker-compose.yml
COMPOSE_DEV_API := docker compose -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: help build run dev-api dev-website stop clean

help:
	@printf "Available targets:\n"
	@printf "  make build  Build all Docker images using the production-safe Compose config\n"
	@printf "  make run    Start the Docker Compose stack in detached mode without publishing the API port\n"
	@printf "  make dev-api  Start database, db-init, and api with the dev override that publishes the API on 127.0.0.1:3000\n"
	@printf "  make dev-website  Start the local website dev server with live reload and /api proxy\n"
	@printf "  make stop   Stop and remove the Docker Compose stack\n"
	@printf "  make clean  Remove the Docker Compose stack and local images\n"

build:
	$(COMPOSE_BASE) build

run:
	$(COMPOSE_BASE) up -d

dev-api:
	$(COMPOSE_DEV_API) up -d database db-init api

dev-website:
	WEBSITE_API_PROXY_TARGET=$(WEBSITE_API_PROXY_TARGET) WEBSITE_DEV_PORT=$(WEBSITE_DEV_PORT) npm run dev:website

stop:
	$(COMPOSE_DEV_API) down

clean:
	$(COMPOSE_DEV_API) down --rmi local

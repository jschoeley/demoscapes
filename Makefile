.DEFAULT_GOAL := help

WEBSITE_API_PROXY_TARGET ?= http://127.0.0.1:3000
WEBSITE_DEV_PORT ?= 8090

.PHONY: help build run run-api dev-website stop clean

help:
	@printf "Available targets:\n"
	@printf "  make build  Build all Docker images\n"
	@printf "  make run    Start the Docker Compose stack in detached mode\n"
	@printf "  make run-api  Start database, db-init, and api for local website development\n"
	@printf "  make dev-website  Start the local website dev server with live reload and /api proxy\n"
	@printf "  make stop   Stop and remove the Docker Compose stack\n"
	@printf "  make clean  Remove the Docker Compose stack and local images\n"

build:
	docker compose build

run:
	docker compose up -d

run-api:
	docker compose up -d database db-init api

dev-website:
	WEBSITE_API_PROXY_TARGET=$(WEBSITE_API_PROXY_TARGET) WEBSITE_DEV_PORT=$(WEBSITE_DEV_PORT) npm run dev:website

stop:
	docker compose down

clean:
	docker compose down --rmi local

.DEFAULT_GOAL := help

.PHONY: help build run stop clean

help:
	@printf "Available targets:\n"
	@printf "  make build  Build all Docker images\n"
	@printf "  make run    Start the Docker Compose stack in detached mode\n"
	@printf "  make stop   Stop and remove the Docker Compose stack\n"
	@printf "  make clean  Remove the Docker Compose stack and local images\n"

build:
	docker compose build

run:
	docker compose up -d

stop:
	docker compose down

clean:
	docker compose down --rmi local

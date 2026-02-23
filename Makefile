.PHONY: help up down local-up local-down web-up web-down nest-install nest-start prisma-generate prisma-push django-install django-migrate bootstrap check-boundaries smoke-internal-bridge

DATABASE_URL ?= postgresql://postgres:password@localhost:5432/edamaa
DIRECT_URL ?= $(DATABASE_URL)
REDIS_URL ?= redis://localhost:6379
DJANGO_INTERNAL_API_URL ?= http://localhost:8000/admin-api
INTERNAL_API_TOKEN ?=

help:
	@echo "Make targets: up down local-up local-down web-up web-down nest-install nest-start prisma-generate prisma-push django-install django-migrate bootstrap check-boundaries smoke-internal-bridge"
	@echo "Vars: DATABASE_URL, DIRECT_URL, REDIS_URL, DJANGO_INTERNAL_API_URL, INTERNAL_API_TOKEN"

up:
	docker-compose up -d

down:
	docker-compose down

local-up:
	bash scripts/local-up.sh

local-down:
	bash scripts/local-down.sh

web-up:
	bash scripts/web-up.sh

web-down:
	bash scripts/web-down.sh

nest-install:
	cd backend/nestjs && npm install --no-audit --no-fund

prisma-generate:
	cd backend/nestjs && DATABASE_URL='$(DATABASE_URL)' DIRECT_URL='$(DIRECT_URL)' npx prisma generate

prisma-push:
	cd backend/nestjs && DATABASE_URL='$(DATABASE_URL)' DIRECT_URL='$(DIRECT_URL)' npx prisma db push

nest-start:
	cd backend/nestjs && DATABASE_URL='$(DATABASE_URL)' DIRECT_URL='$(DIRECT_URL)' REDIS_URL='$(REDIS_URL)' DJANGO_INTERNAL_API_URL='$(DJANGO_INTERNAL_API_URL)' INTERNAL_API_TOKEN='$(INTERNAL_API_TOKEN)' nohup npm run start > /tmp/edamaa-nestjs.log 2>&1 &

django-install:
	cd backend/django && python3 -m venv .venv || true && . .venv/bin/activate && pip install -r requirements.txt

django-migrate:
	cd backend/django && . .venv/bin/activate && DATABASE_URL='$(DATABASE_URL)' REDIS_URL='$(REDIS_URL)' python manage.py migrate

bootstrap:
	bash scripts/bootstrap.sh

check-boundaries:
	bash scripts/check_service_boundaries.sh

smoke-internal-bridge:
	INTERNAL_API_TOKEN='$(INTERNAL_API_TOKEN)' NEST_BASE_URL='http://127.0.0.1:3001' bash scripts/smoke_internal_bridge.sh

# Relay — Docker & Infrastructure

## docker-compose.yml

```yaml
version: "3.9"

services:

  postgres:
    image: postgres:16-alpine
    container_name: relay_postgres
    environment:
      POSTGRES_DB: relay
      POSTGRES_USER: relay
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U relay"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - relay_net

  pgbouncer:
    image: edoburu/pgbouncer:1.22.1
    container_name: relay_pgbouncer
    environment:
      DATABASE_URL: postgres://relay:${POSTGRES_PASSWORD}@postgres:5432/relay
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 100
      DEFAULT_POOL_SIZE: 20
      AUTH_TYPE: scram-sha-256
      DB_USER: relay
      DB_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "6432:5432"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - relay_net

  redis:
    image: redis:7.2-alpine
    container_name: relay_redis
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - relay_net

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: relay_api
    command: python manage.py runserver 0.0.0.0:8000
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.development
      - DATABASE_URL=postgres://relay:${POSTGRES_PASSWORD}@pgbouncer:5432/relay
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/1
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    depends_on:
      pgbouncer:
        condition: service_started
      redis:
        condition: service_healthy
    networks:
      - relay_net

  celery_worker:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: relay_celery_worker
    command: celery -A config.celery worker -Q relay.dispatch,relay.billing,relay.maintenance -c 4 --loglevel=info
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.development
      - DATABASE_URL=postgres://relay:${POSTGRES_PASSWORD}@pgbouncer:5432/relay
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/1
    volumes:
      - .:/app
    depends_on:
      - redis
      - pgbouncer
    networks:
      - relay_net

  celery_beat:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: relay_celery_beat
    command: celery -A config.celery beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.development
      - DATABASE_URL=postgres://relay:${POSTGRES_PASSWORD}@pgbouncer:5432/relay
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/1
    volumes:
      - .:/app
    depends_on:
      - redis
      - pgbouncer
    networks:
      - relay_net

volumes:
  postgres_data:
  redis_data:

networks:
  relay_net:
    driver: bridge
```

---

## Dockerfile

```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements/base.txt requirements/base.txt
RUN pip install --no-cache-dir -r requirements/base.txt

COPY . .
```

---

## .env.example

```env
# Django
SECRET_KEY=change-me-in-production
DJANGO_SETTINGS_MODULE=config.settings.development

# Postgres
POSTGRES_PASSWORD=localdevpassword

# Redis
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1

# Razorpay
RAZORPAY_KEY_ID=rzp_test_XXXXX
RAZORPAY_KEY_SECRET=XXXXX
RAZORPAY_WEBHOOK_SECRET=XXXXX
RAZORPAY_PLAN_ID_PRO=plan_XXXXX
RAZORPAY_PLAN_ID_SCALE=plan_XXXXX
```

---

## PgBouncer Notes

The `edoburu/pgbouncer` image reads `DATABASE_URL` and auto-generates `pgbouncer.ini`.

**Critical Django setting when using PgBouncer transaction mode:**
```python
# config/settings/base.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'relay',
        'USER': 'relay',
        'PASSWORD': env('POSTGRES_PASSWORD'),
        'HOST': 'pgbouncer',
        'PORT': '5432',
        'CONN_MAX_AGE': 0,  # REQUIRED — persistent connections break transaction pooling
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}
```

**Why transaction pooling:** Each Celery task uses a short DB transaction. Transaction pooling returns the server connection to the pool immediately after the transaction, allowing 4 Celery workers to share 20 Postgres connections instead of holding 4 permanently.

---

## Redis DB Allocation

| DB  | Usage                      |
|-----|----------------------------|
| 0   | Django cache (cache-aside) |
| 1   | Celery broker              |
| 2   | Rate limiting counters     |
| 3   | Idempotency keys           |

Configure in `settings/base.py`:
```python
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://redis:6379/0",
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
}

CELERY_BROKER_URL = "redis://redis:6379/1"
CELERY_RESULT_BACKEND = "redis://redis:6379/1"

RATE_LIMIT_REDIS_DB = 2
IDEMPOTENCY_REDIS_DB = 3
```

---

## Quick Start

```bash
cp .env.example .env
# fill in .env values

docker compose up -d postgres redis
docker compose up -d pgbouncer
docker compose run --rm api python manage.py migrate
docker compose up -d
```

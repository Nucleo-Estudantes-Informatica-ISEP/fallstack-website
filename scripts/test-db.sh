#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="fallstack-test-postgres"
PORT="54329"
DB_NAME="fallstack_test"
DB_USER="postgres"
DB_PASS="postgres"
DB_HOST="127.0.0.1"

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${PORT}/${DB_NAME}"
export DIRECT_URL="$DATABASE_URL"

ensure_docker() {
  if ! docker info >/dev/null 2>&1; then
    echo "Erro: O serviço Docker não parece estar em execução." >&2
    exit 1
  fi
}

start_db() {
  ensure_docker

  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Container '${CONTAINER_NAME}' já está em execução."
  elif docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "A iniciar container existente '${CONTAINER_NAME}'..."
    docker start "${CONTAINER_NAME}" >/dev/null
  else
    echo "A criar e iniciar novo container '${CONTAINER_NAME}'..."
    docker run -d \
      --name "${CONTAINER_NAME}" \
      -p "${DB_HOST}:${PORT}:5432" \
      -e POSTGRES_PASSWORD="${DB_PASS}" \
      -e POSTGRES_DB="${DB_NAME}" \
      postgres:16 >/dev/null
  fi

  echo "⏳ A aguardar prontidão do PostgreSQL..."
  local retries=30
  until docker exec "${CONTAINER_NAME}" pg_isready -U "${DB_USER}" >/dev/null 2>&1 || [ "$retries" -le 0 ]; do
    sleep 1
    retries=$((retries - 1))
  done

  if [ "$retries" -le 0 ]; then
    echo "Timeout à espera do PostgreSQL." >&2
    exit 1
  fi

  echo "A aplicar migrações do Prisma na base de dados de teste..."
  pnpm exec prisma migrate deploy
  echo "Base de dados de teste pronta!"
}

stop_db() {
  ensure_docker
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "A parar '${CONTAINER_NAME}'..."
    docker stop "${CONTAINER_NAME}" >/dev/null
    echo "Container parado."
  else
    echo "Container '${CONTAINER_NAME}' não está em execução."
  fi
}

print_env() {
  echo "export DATABASE_URL=\"$DATABASE_URL\""
  echo "export DIRECT_URL=\"$DIRECT_URL\""
}

case "${1:-}" in
  start)
    start_db
    ;;
  stop)
    stop_db
    ;;
  env)
    print_env
    ;;
  help|--help|-h)
    echo "Uso:"
    echo "  $0 start              # Inicia o container e aplica as migrações"
    echo "  $0 stop               # Para o container"
    echo "  $0 env                # Mostra os exports de variáveis de ambiente"
    echo "  $0 <comando...>       # Inicia o container e corre o comando (ex: $0 pnpm test:integration)"
    echo "  $0                    # Por omissão, inicia o container e corre 'pnpm test:integration'"
    ;;
  *)
    start_db
    if [ "$#" -eq 0 ]; then
      echo "A executar pnpm test:integration..."
      exec pnpm test:integration
    else
      echo "A executar: $*"
      exec "$@"
    fi
    ;;
esac

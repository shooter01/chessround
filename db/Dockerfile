# db/Dockerfile
FROM postgres:16.2

# копируем ваши init‑скрипты
COPY init/chesscup_init.sql /docker-entrypoint-initdb.d/01-chesscup_init.sql

-- Скрипт инициализации схемы и таблицы для ChessCup

-- 1) Создаём схему chesscup, если её нет, и назначаем владельцем пользователя keycloak
CREATE SCHEMA IF NOT EXISTS chesscup
  AUTHORIZATION keycloak;

-- 2) Устанавливаем схему по умолчанию для выполнения следующих команд
SET search_path = chesscup;

-- 3) Таблица для хранения lichess_id + токен
CREATE TABLE IF NOT EXISTS chesscup_users (
  id           SERIAL       PRIMARY KEY,
  lichess_id   TEXT         NOT NULL UNIQUE,
  access_token TEXT         NOT NULL,
  issued_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 4) Индекс для быстрого поиска по токену
CREATE INDEX IF NOT EXISTS idx_chesscup_users_token
  ON chesscup_users(access_token);

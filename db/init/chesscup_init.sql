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


-- 5) Расширяем схему: таблица сессий для хранения session_id + текущих пазлов
-- Убедитесь, что расширение для UUID доступно
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Создание таблицы с новым столбцом
CREATE TABLE IF NOT EXISTS chesscup.chesscup_sessions (
  session_id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  lichess_id                    TEXT         NOT NULL
                                      REFERENCES chesscup.chesscup_users(lichess_id)
                                        ON DELETE CASCADE,
  puzzles                       TEXT         NOT NULL,   -- JSON-массив пазлов
  current_session_puzzle_index  INTEGER      NOT NULL DEFAULT -1,  -- новый столбец
  created_at                    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2) Индекс по lichess_id
CREATE INDEX IF NOT EXISTS idx_chesscup_sessions_lichess_id
  ON chesscup.chesscup_sessions(lichess_id);

-- 3) Для уже существующей таблицы (миграция), если нужно:
ALTER TABLE chesscup.chesscup_sessions
  ADD COLUMN IF NOT EXISTS current_session_puzzle_index INTEGER NOT NULL DEFAULT -1,
  ADD COLUMN IF NOT EXISTS current_session_points       INTEGER NOT NULL DEFAULT 0;
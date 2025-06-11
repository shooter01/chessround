-- Создание новой схемы
CREATE SCHEMA IF NOT EXISTS notification_service;
SET search_path TO notification_service, public;

-- Удаляем старые таблицы если они существуют
DROP TABLE IF EXISTS workflow_step_messages CASCADE;
DROP TABLE IF EXISTS workflow_steps CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;

-- Создание новых таблиц в правильном порядке
CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id VARCHAR(255) NOT NULL, -- Добавлено поле user_id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_steps (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_step_messages (
    id SERIAL PRIMARY KEY,
    step_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    FOREIGN KEY (step_id) REFERENCES workflow_steps(id) ON DELETE CASCADE
);

-- Миграция данных
INSERT INTO workflows (id, name, description)
SELECT id, name, description 
FROM public.workspaces 
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, 
    description = EXCLUDED.description;

INSERT INTO workflow_steps (id, workflow_id, step_name)
SELECT id, workflow_id, step_name 
FROM public.workflows_steps
ON CONFLICT (id) DO UPDATE 
SET workflow_id = EXCLUDED.workflow_id,
    step_name = EXCLUDED.step_name;

INSERT INTO workflow_step_messages (id, step_id, message)
SELECT id, step_id, message 
FROM public.workflow_step_messages
ON CONFLICT (id) DO UPDATE 
SET step_id = EXCLUDED.step_id,
    message = EXCLUDED.message;



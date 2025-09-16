// Jobs/server.js
// Отдельный мини-сервер/джобер для стартов и тиков раундов.
// Зависимости: express. DB берём из ../db.js (pg уже там подключён).

require('dotenv').config?.();
const express = require('express');
const { pool } = require('../db'); // <-- используем твой пул

// --- ENV ---
const PORT = Number(process.env.JOBS_PORT || 5051);

// интервалы (мс)
const START_INTERVAL_MS = Number(
  process.env.START_INTERVAL_MS || 3000
);
const TICK_INTERVAL_MS = Number(process.env.TICK_INTERVAL_MS || 3000);

// батчи (сколько строк за тик)
const START_BATCH_SIZE = Number(process.env.START_BATCH_SIZE || 500);
const TICK_BATCH_SIZE = Number(process.env.TICK_BATCH_SIZE || 500);

// вкл/выкл тиканье раундов
const ENABLE_ROUND_TICKER =
  String(process.env.ENABLE_ROUND_TICKER || 'true') === 'true';

// На каждый коннект: UTC и search_path на chesscup
pool.on('connect', async (client) => {
  try {
    await client.query("SET TIME ZONE 'UTC'");
    await client.query('SET search_path TO chesscup, public');
  } catch (e) {
    console.error(
      '[jobs] failed to set session params:',
      e?.message || e
    );
  }
});

// --- SQL (батч + SKIP LOCKED) ---
const SQL_START_DUE_TX = `
WITH due AS (
  SELECT id
  FROM chesscup.step_tournaments
  WHERE is_started = false
    AND is_over    = false
    AND start_time <= now()
  ORDER BY start_time
  LIMIT $1
  FOR UPDATE SKIP LOCKED
)
UPDATE chesscup.step_tournaments t
SET
  is_started      = true,
  current_round   = CASE WHEN t.current_round = 0 THEN 1 ELSE t.current_round END,
  last_round_time = t.start_time,
  next_round_time = t.start_time + (t.round_gap_sec || ' seconds')::interval,
  updated_at      = now()
FROM due
WHERE t.id = due.id
RETURNING t.id, t.short_id, t.title, t.current_round, t.max_rounds, t.next_round_time;
`;

const SQL_TICK_ROUNDS_TX = `
WITH due AS (
  SELECT id
  FROM chesscup.step_tournaments
  WHERE is_started = true
    AND is_over    = false
    AND next_round_time <= now()
  ORDER BY next_round_time
  LIMIT $1
  FOR UPDATE SKIP LOCKED
)
UPDATE chesscup.step_tournaments t
SET
  current_round   = t.current_round + 1,
  last_round_time = t.next_round_time,
  next_round_time = CASE
                      WHEN (t.current_round + 1) >= t.max_rounds
                        THEN NULL
                      ELSE t.next_round_time + (t.round_gap_sec || ' seconds')::interval
                    END,
  is_over         = (t.current_round + 1) >= t.max_rounds,
  updated_at      = now()
FROM due
WHERE t.id = due.id
RETURNING t.id, t.short_id, t.title, t.current_round, t.max_rounds, t.is_over, t.next_round_time;
`;

// --- Jobs ---
function startStarterJob({
  intervalMs = 3000,
  batchSize = 500,
  onStarted,
} = {}) {
  let ticking = false;
  const tick = async () => {
    if (ticking) return;
    ticking = true;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(SQL_START_DUE_TX, [
        batchSize,
      ]);
      await client.query('COMMIT');
      if (rows.length) {
        console.log(`[starter] started ${rows.length} tournaments`);
        onStarted?.(rows);
      }
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch {}
      console.error('[starter] error:', e?.message || e);
    } finally {
      client.release();
      ticking = false;
    }
  };
  tick(); // сразу прогон
  const timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer);
}

function startRoundTickerJob({
  intervalMs = 3000,
  batchSize = 500,
  onTick,
} = {}) {
  let ticking = false;
  const tick = async () => {
    if (ticking) return;
    ticking = true;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(SQL_TICK_ROUNDS_TX, [
        batchSize,
      ]);
      await client.query('COMMIT');
      if (rows.length) {
        console.log(`[ticker] progressed ${rows.length} tournaments`);
        onTick?.(rows);
      }
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch {}
      console.error('[ticker] error:', e?.message || e);
    } finally {
      client.release();
      ticking = false;
    }
  };
  tick();
  const timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer);
}

// --- HTTP (health + ручные триггеры) ---
const app = express();
app.use(express.json());

app.get('/healthz', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res
      .status(500)
      .json({ ok: false, error: String(e?.message || e) });
  }
});

app.post('/internal/run-starter', async (req, res) => {
  const limit = Number(req.query.limit || START_BATCH_SIZE);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(SQL_START_DUE_TX, [limit]);
    await client.query('COMMIT');
    res.json({ started: rows.length, rows });
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    client.release();
  }
});

app.post('/internal/run-ticker', async (req, res) => {
  const limit = Number(req.query.limit || TICK_BATCH_SIZE);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(SQL_TICK_ROUNDS_TX, [limit]);
    await client.query('COMMIT');
    res.json({ progressed: rows.length, rows });
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    client.release();
  }
});

// --- Запуск ---
const stopJobs = [];
app.listen(PORT, () => {
  console.log(`[jobs] listening on :${PORT}`);
  stopJobs.push(
    startStarterJob({
      intervalMs: START_INTERVAL_MS,
      batchSize: START_BATCH_SIZE,
    })
  );
  if (ENABLE_ROUND_TICKER) {
    stopJobs.push(
      startRoundTickerJob({
        intervalMs: TICK_INTERVAL_MS,
        batchSize: TICK_BATCH_SIZE,
      })
    );
  }
});

// Graceful shutdown
async function shutdown(sig) {
  console.log(`[jobs] ${sig} received, shutting down...`);
  for (const stop of stopJobs) {
    try {
      stop();
    } catch {}
  }
  try {
    await pool.end();
  } catch {}
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

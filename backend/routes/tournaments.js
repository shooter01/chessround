// routes/tournaments.js
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();
const db = require('../db');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false }, // если нужен SSL
});

function toUiStatus(is_started, is_over) {
  return is_started && !is_over ? 'active' : 'upcoming';
}
// ====== auth helpers (как в /puzzles/solve) ======
// вместо SELECT lichess_id, lichess_username ...
async function userFromAuthHeader(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  // берём только lichess_id
  const r = await db.query(
    `SELECT lichess_id
       FROM chesscup.chesscup_users
      WHERE access_token = $1`,
    [token]
  );
  if (!r.rowCount) return null;

  const lichessId = r.rows[0].lichess_id; // часто это строковый логин lichess
  return {
    id: lichessId, // используем как идентификатор
    name: lichessId, // и как отображаемое имя
  };
}

async function authOptional(req, res, next) {
  try {
    req.user = await userFromAuthHeader(req);
    next();
  } catch (e) {
    console.error('authOptional error', e);
    next();
  }
}

async function authRequired(req, res, next) {
  try {
    const u = await userFromAuthHeader(req);
    if (!u) return res.status(401).json({ error: 'Unauthorized' });
    req.user = u;
    next();
  } catch (e) {
    console.error('authRequired error', e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

function genShortId(title = 'tournament') {
  const base =
    String(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'tournament';
  const rand = Math.random().toString(36).slice(2, 7);
  return `${base}-${rand}`;
}

function clampInt(v, min, max, def) {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

// POST /tournaments/create
router.post('/create', async (req, res) => {
  try {
    const {
      title,
      tournamentPassword, // в текущей схеме нет поля — пока игнорируем или можно сохранить в отдельной таблице/JSONB (по желанию)
      timeBeforeTournamentStartSelector, // "1" | "2" | ... минуты
      flatpickrISOTime, // ISO дата/время если выбран кастомный старт
      time, // "start_in" | "custom"
      max_rounds,
      puzzles_in_round,
      theme, // id/код темы
      theme_name, // название темы (передадим с фронта)
      league_id,
      league_name,
    } = req.body || {};

    // валидация
    const errors = [];
    if (!title || String(title).trim().length < 3) {
      errors.push({
        field: 'title',
        msg: 'Title is required (min 3 chars)',
      });
    }
    if (String(title || '').length > 100) {
      errors.push({
        field: 'title',
        msg: 'Title must be ≤ 100 chars',
      });
    }

    const rounds = clampInt(max_rounds, 1, 50, 1);
    const ppr = clampInt(puzzles_in_round, 1, 100, 10);

    let startTime;
    if (time === 'start_in') {
      const minutes = clampInt(
        timeBeforeTournamentStartSelector,
        1,
        240,
        5
      );
      startTime = new Date(Date.now() + minutes * 60 * 1000);
    } else {
      // кастомная дата (ожидаем ISO)
      const dt = new Date(flatpickrISOTime || '');
      if (Number.isNaN(dt.getTime())) {
        errors.push({
          field: 'flatpickrISOTime',
          msg: 'Invalid custom start date',
        });
      } else {
        startTime = dt;
      }
    }

    if (errors.length) {
      return res.status(422).json({ errors });
    }

    // Собираем поля под твою таблицу chesscup.step_tournaments
    // Обрати внимание: у нас есть short_id (slug), флаги is_started/is_over, current_round=0
    const shortId = genShortId(title);
    const nextRoundTime = startTime; // до старта пусть = start_time
    const timePerPuzzleSec = 30; // у тебя в схеме default 30; можно сделать настраиваемым

    // пробуем зарезервировать уникальный short_id (до 3 попыток)
    let created;
    for (let i = 0; i < 3; i++) {
      const cand = i === 0 ? shortId : genShortId(title);
      try {
        const insertSql = `
          INSERT INTO chesscup.step_tournaments
          (short_id, "type", title,
           season_id, season_points, league_id, league_name,
           selected_clubs,
           theme, theme_name, "level",
           start_time, last_round_time, next_round_time,
           time_per_puzzle_sec, puzzles_per_round, current_round, round_gap_sec, max_rounds,
           is_started, is_over, owner_id, owner_name, participants_count, ip)
          VALUES
          ($1, 'arena', $2,
           $3, true, $4, $5,
           '[]'::jsonb,
           $6, $7, NULL,
           $8, NULL, $9,
           $10, $11, 0, 60, $12,
           false, false, $13, $14, 0, NULL)
          RETURNING id, short_id, title, start_time, next_round_time;
        `;
        const params = [
          cand, // $1 short_id
          title, // $2
          'noleague', // $3 season_id (по умолчанию)
          league_id || 'noleague', // $4
          league_name || 'Без лиги', // $5
          theme || null, // $6
          theme_name || null, // $7
          startTime.toISOString(), // $8
          nextRoundTime.toISOString(), // $9
          timePerPuzzleSec, // $10
          ppr, // $11
          rounds, // $12
          req.user?.id || null, // $13 owner_id (если есть аутентификация)
          req.user?.name || null, // $14 owner_name
        ];
        const { rows } = await pool.query(insertSql, params);
        created = rows[0];
        break; // успех
      } catch (e) {
        // 23505 unique_violation (short_id unique) — пробуем ещё раз
        if (e && e.code === '23505') {
          continue;
        }
        console.error('create tournament error:', e);
        return res
          .status(500)
          .json({ error: 'Internal Server Error' });
      }
    }

    if (!created) {
      return res
        .status(409)
        .json({ error: 'Could not allocate unique short_id' });
    }

    // ответ для фронта
    return res.json({
      ok: true,
      id: created.id,
      slug: created.short_id,
      startAt: created.start_time,
      nextRoundAt: created.next_round_time,
    });
  } catch (err) {
    console.error('POST /tournaments/create error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/', async (req, res) => {
  const scope = String(req.query.scope || 'today'); // 'today' | 'my'
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
  const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

  try {
    if (scope === 'today') {
      const sql = `
        SELECT
          t.id,
          t.short_id,                -- => slug
          t.title,
          t.is_started,
          t.is_over,
          t.current_round,
          t.max_rounds,
          t.start_time,
          t.next_round_time,
          COALESCE(t.theme_name, '')        AS description,
          COALESCE(t.participants_count, 0) AS players_count
        FROM chesscup.step_tournaments t
        WHERE
          -- уже идёт
          (t.is_started = true AND t.is_over = false)
          OR
          -- стартует сегодня (по UTC)
          (t.start_time::date = (now() AT TIME ZONE 'UTC')::date)
        ORDER BY (NOT t.is_started)::int, t.start_time ASC
        LIMIT $1 OFFSET $2
      `;
      const { rows } = await pool.query(sql, [limit, offset]);

      const data = rows.map((r) => ({
        id: r.id,
        slug: r.short_id, // маппим short_id
        title: r.title,
        playersCount: Number(r.players_count),
        status: toUiStatus(r.is_started, r.is_over), // 'active' | 'upcoming'
        roundInfo:
          r.is_started &&
          !r.is_over &&
          r.current_round &&
          r.max_rounds
            ? `${r.current_round}/${r.max_rounds}`
            : undefined,
        countdown: r.is_started
          ? null
          : r.next_round_time || r.start_time, // ISO
        startAt: r.start_time, // ISO → фронт сам форматирует
        nextRoundAt: r.next_round_time, // ISO
        description: r.description,
      }));

      return res.json(data);
    }

    // scope === 'my' — по владельцу (если нужно — можно добавить выборку по участникам)
    const userId = req.user?.id; // зависит от твоего auth-мидлвари
    if (!userId)
      return res.status(401).json({ error: 'Unauthorized' });

    const sql = `
      SELECT
        t.id,
        t.short_id,
        t.title,
        t.is_started,
        t.is_over,
        t.current_round,
        t.max_rounds,
        t.start_time,
        t.next_round_time,
        COALESCE(t.theme_name, '')        AS description,
        COALESCE(t.participants_count, 0) AS players_count
      FROM chesscup.step_tournaments t
      WHERE t.owner_id = $1
      ORDER BY t.updated_at DESC
      LIMIT $2 OFFSET $3
    `;
    const { rows } = await pool.query(sql, [userId, limit, offset]);

    const data = rows.map((r) => ({
      id: r.id,
      slug: r.short_id,
      title: r.title,
      playersCount: Number(r.players_count),
      status: toUiStatus(r.is_started, r.is_over),
      roundInfo:
        r.is_started && !r.is_over && r.current_round && r.max_rounds
          ? `${r.current_round}/${r.max_rounds}`
          : undefined,
      countdown: r.is_started
        ? null
        : r.next_round_time || r.start_time,
      startAt: r.start_time,
      nextRoundAt: r.next_round_time,
      description: r.description,
    }));

    return res.json(data);
  } catch (e) {
    console.error('GET /tournaments error:', e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/:slug', authOptional, async (req, res) => {
  const slug = String(req.params.slug);
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);

  const sqlTournament = `
    SELECT
      t.id, t.short_id, t.title, t.theme_name, t.season_id, t.league_id, t.league_name,
      t.is_started, t.is_over, t.current_round, t.max_rounds,
      t.start_time, t.next_round_time, t.round_gap_sec, t.puzzles_per_round, t.time_per_puzzle_sec,
      t.participants_count, t.owner_id, t.owner_name, t.created_at, t.updated_at
    FROM chesscup.step_tournaments t
    WHERE t.short_id = $1
    LIMIT 1
  `;
  const sqlParticipants = `
    SELECT p.user_id, p.user_name, p.joined_at
    FROM chesscup.step_tournaments_participants p
    JOIN chesscup.step_tournaments t ON t.id = p.tournament_id
    WHERE t.short_id = $1
    ORDER BY p.joined_at ASC
    LIMIT $2
  `;

  try {
    const [tq, pq] = await Promise.all([
      db.query(sqlTournament, [slug]),
      db.query(sqlParticipants, [slug, limit]),
    ]);
    if (!tq.rows.length)
      return res.status(404).json({ error: 'Not found' });

    const t = tq.rows[0];
    const meId = req.user?.id ?? null;
    const isParticipant = !!(
      meId && pq.rows.some((r) => String(r.user_id) === String(meId))
    );

    return res.json({
      id: t.id,
      slug: t.short_id,
      title: t.title,
      description: t.theme_name || '',
      status: toUiStatus(t.is_started, t.is_over),
      isStarted: t.is_started,
      isOver: t.is_over,
      currentRound: t.current_round,
      maxRounds: t.max_rounds,
      startAt: t.start_time,
      nextRoundAt: t.next_round_time,
      roundGapSec: t.round_gap_sec,
      puzzlesPerRound: t.puzzles_per_round,
      timePerPuzzleSec: t.time_per_puzzle_sec,
      participantsCount: t.participants_count,
      ownerId: t.owner_id,
      ownerName: t.owner_name,
      leagueId: t.league_id,
      leagueName: t.league_name,
      isParticipant,
      participants: pq.rows,
    });
  } catch (e) {
    console.error('GET /tournaments/:slug error:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// полный список участников (если нужен)
router.get('/:slug/participants', async (req, res) => {
  const slug = String(req.params.slug);
  const limit = Math.min(
    parseInt(req.query.limit || '1000', 10),
    5000
  );
  const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

  const sql = `
    SELECT p.user_id, p.user_name, p.joined_at
    FROM chesscup.step_tournaments_participants p
    JOIN chesscup.step_tournaments t ON t.id = p.tournament_id
    WHERE t.short_id = $1
    ORDER BY p.joined_at ASC
    LIMIT $2 OFFSET $3
  `;
  try {
    const { rows } = await pool.query(sql, [slug, limit, offset]);
    res.json(rows);
  } catch (e) {
    console.error('GET /tournaments/:slug/participants error:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/:slug/leaderboard', authOptional, async (req, res) => {
  const slug = String(req.params.slug);
  console.log('HIT /tournaments/:slug/leaderboard', slug); // дебаг в логе

  try {
    // 1) мета по турниру
    const tRes = await db.query(
      `SELECT id, max_rounds, current_round, is_over
         FROM chesscup.step_tournaments
        WHERE short_id = $1
        LIMIT 1`,
      [slug]
    );
    if (!tRes.rowCount) {
      return res.status(404).json({ error: 'Not found' });
    }
    const t = tRes.rows[0];

    // 2) если нет ещё таблицы результатов — вернём участников как заглушку
    //    (чтобы фронт увидел ответ и ты убедился, что вызов идёт)
    const pRes = await db.query(
      `SELECT user_id, user_name, joined_at
         FROM chesscup.step_tournaments_participants
        WHERE tournament_id = $1
        ORDER BY joined_at ASC
        LIMIT 500`,
      [t.id]
    );

    // 3) соберём строки под фронтовый формат
    const rows = pRes.rows.map((r) => ({
      user_id: r.user_id,
      user_name: r.user_name,
      total_points: 0,
      time_spent_sec: 0,
      // сгенерим пустые round_points_1..N
      ...Object.fromEntries(
        Array.from({ length: t.max_rounds }, (_, i) => [
          `round_points_${i + 1}`,
          null,
        ])
      ),
    }));

    return res.json({
      maxRounds: t.max_rounds,
      currentRound: t.current_round,
      isOver: t.is_over,
      rows,
    });
  } catch (e) {
    console.error('GET /tournaments/:slug/leaderboard error:', e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/:slug/join', authRequired, async (req, res) => {
  const slug = String(req.params.slug);
  const userId = req.user.id;
  const userName = req.user.name || 'Player';

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const tRes = await client.query(
      `SELECT id, is_over FROM chesscup.step_tournaments WHERE short_id=$1 FOR UPDATE`,
      [slug]
    );
    if (!tRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }
    const t = tRes.rows[0];
    if (t.is_over) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Tournament finished' });
    }

    const ins = await client.query(
      `INSERT INTO chesscup.step_tournaments_participants (tournament_id, user_id, user_name)
       VALUES ($1,$2,$3)
       ON CONFLICT (tournament_id, user_id) DO NOTHING
       RETURNING 1`,
      [t.id, userId, userName]
    );

    if (ins.rowCount > 0) {
      await client.query(
        `UPDATE chesscup.step_tournaments
            SET participants_count = participants_count + 1
          WHERE id=$1`,
        [t.id]
      );
    }

    const cnt = await client.query(
      `SELECT participants_count FROM chesscup.step_tournaments WHERE id=$1`,
      [t.id]
    );

    await client.query('COMMIT');
    res.json({
      ok: true,
      participantsCount: cnt.rows[0].participants_count,
    });
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('POST /tournaments/:slug/join error:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

router.post('/:slug/leave', authRequired, async (req, res) => {
  const slug = String(req.params.slug);
  const userId = req.user.id;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const tRes = await client.query(
      `SELECT id FROM chesscup.step_tournaments WHERE short_id=$1 FOR UPDATE`,
      [slug]
    );
    if (!tRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }
    const t = tRes.rows[0];

    const del = await client.query(
      `DELETE FROM chesscup.step_tournaments_participants
       WHERE tournament_id=$1 AND user_id=$2
       RETURNING 1`,
      [t.id, userId]
    );

    if (del.rowCount > 0) {
      await client.query(
        `UPDATE chesscup.step_tournaments
           SET participants_count = GREATEST(participants_count - 1, 0)
         WHERE id=$1`,
        [t.id]
      );
    }

    const cnt = await client.query(
      `SELECT participants_count FROM chesscup.step_tournaments WHERE id=$1`,
      [t.id]
    );

    await client.query('COMMIT');
    res.json({
      ok: true,
      participantsCount: cnt.rows[0].participants_count,
    });
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('POST /tournaments/:slug/leave error:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

module.exports = router;

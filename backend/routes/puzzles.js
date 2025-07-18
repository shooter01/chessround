const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios');

const checkJwt = require('../middlewares/checkJwt');
const {
  sendTelegramMessage,
  sendEmailFromDB,
} = require('../services/notifications');
const { formatMessage } = require('./utils/formatMessage');

const PUZZLES_API =
  process.env.PUZZLES_API_URL || 'http://host.docker.internal:8080';

// router.use(checkJwt);

/**
 * [GET] /puzzles/get?level=5&theme=fork&limit=2
 */
router.get('/get', async (req, res) => {
  // 0) Разбор mode из query
  let { mode = '3m' } = req.query;

  // если пришло '3' или '5' — дособираем 'm'
  if (mode === '3' || mode === '5') {
    mode = mode + 'm';
  }

  // теперь валидируем
  const allowed = ['3m', '5m', 'survival'];
  if (!allowed.includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode parameter' });
  }

  // 1) Извлекаем токен
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.slice(7);

  try {
    // 2) Получаем lichess_id
    const userQ = await db.query(
      `SELECT lichess_id
         FROM chesscup.chesscup_users
        WHERE access_token = $1`,
      [token]
    );
    if (userQ.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const lichessId = userQ.rows[0].lichess_id;

    // 3) Запрашиваем список паззлов из внешнего сервиса
    const response = await axios.get(`${PUZZLES_API}/puzzles`, {
      headers: { Accept: 'application/json' },
    });
    const puzzles = response.data; // предполагаем, что это массив или объект с массивом

    // 4) UPSERT в chesscup_sessions, теперь с полем mode
    const upsertSql = `
      INSERT INTO chesscup.chesscup_sessions
        (lichess_id, puzzles, mode)
      VALUES ($1, $2, $3)
      ON CONFLICT (lichess_id)
      DO UPDATE SET
        puzzles                      = EXCLUDED.puzzles,
        mode                         = EXCLUDED.mode,
        updated_at                   = now(),
        session_id                   = gen_random_uuid(),
        current_session_points       = 0,
        current_session_puzzle_index = 0
      RETURNING session_id
    `;

    const upsertRes = await db.query(upsertSql, [
      lichessId,
      JSON.stringify(puzzles),
      mode,
    ]);
    const sessionId = upsertRes.rows[0].session_id;

    // 5) Отдаём паззлы и новый session_id
    return res.json({ puzzles, session_id: sessionId });
  } catch (err) {
    console.error('Error in /puzzles/get:', err);
    if (err.isAxiosError) {
      return res.status(502).json({
        error: 'Failed to fetch puzzles from external service.',
      });
    }
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * [POST] /puzzles/solve
 * BODY: { fen: string, moves: string, session_id: string }
 */
router.post('/solve', async (req, res) => {
  const { fen, moves, session_id: sessionIdFromBody } = req.body;
  if (!fen || typeof moves !== 'string' || !sessionIdFromBody) {
    return res
      .status(400)
      .json({ error: 'Missing fen, moves or session_id in body' });
  }
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.slice(7);

  try {
    // 3) Находим lichess_id
    const userRes = await db.query(
      `SELECT lichess_id
         FROM chesscup.chesscup_users
        WHERE access_token = $1`,
      [token]
    );
    if (!userRes.rowCount) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const lichessId = userRes.rows[0].lichess_id;

    // 4) Достаём сессию вместе с mode
    const sessRes = await db.query(
      `SELECT session_id,
              puzzles,
              current_session_puzzle_index,
              current_session_points,
              mode
         FROM chesscup.chesscup_sessions
        WHERE lichess_id = $1
          AND session_id = $2`,
      [lichessId, sessionIdFromBody]
    );
    console.log(sessRes.rows[0].puzzles);

    if (!sessRes.rowCount) {
      return res
        .status(400)
        .json({ error: 'Invalid or expired session_id' });
    }
    const {
      session_id: sessionId,
      puzzles: puzzlesText,
      current_session_puzzle_index: currentIndex,
      current_session_points: currentPoints,
      mode,
    } = sessRes.rows[0];

    // 5) Парсим и находим индекс
    let puzzles;
    try {
      puzzles = JSON.parse(puzzlesText).puzzles;
    } catch {
      return res
        .status(500)
        .json({ error: 'Invalid puzzles format in DB' });
    }
    const idx = puzzles.findIndex((p) => p.fen === fen);
    if (idx === -1) {
      return res
        .status(400)
        .json({ error: 'Puzzle not found in session' });
    }

    // 6) Считаем новый индекс и очки
    const newIndex = idx === currentIndex ? currentIndex + 1 : idx;
    const gainedPoint = moves === puzzles[idx].moves ? 1 : 0;
    const newPoints = currentPoints + gainedPoint;

    // 7) Обновляем сессию
    await db.query(
      `UPDATE chesscup.chesscup_sessions
          SET current_session_puzzle_index = $1,
              current_session_points       = $2,
              updated_at                   = now()
        WHERE session_id = $3`,
      [newIndex, newPoints, sessionId]
    );

    // 8) Логируем историю с mode
    await db.query(
      `INSERT INTO chesscup.user_points_history
         (session_id, lichess_id, points, mode)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_id)
       DO UPDATE SET
         points      = EXCLUDED.points,
         mode        = EXCLUDED.mode,
         recorded_at = now()`,
      [sessionId, lichessId, newPoints, mode]
    );

    // 9) Отдаём результат
    return res.json({
      session_id: sessionId,
      current_index: newIndex,
      current_points: newPoints,
    });
  } catch (err) {
    console.error('Error in /puzzles/solve:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * [GET] /puzzles/record?mode=3m|5m|survival
 * Возвращает лучший результат пользователя за сегодня и за всё время в указанном режиме.
 * Заголовок: Authorization: Bearer <token>
 */
router.get('/record', async (req, res) => {
  // 0) Разбор и валидация mode
  let { mode } = req.query;
  if (mode === '3' || mode === '5') {
    mode = mode + 'm';
  }
  const allowed = ['3m', '5m', 'survival'];
  if (!allowed.includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode parameter' });
  }

  // 1) Проверяем заголовок авторизации
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.slice(7);

  try {
    // 2) Определяем lichess_id по токену
    const userQ = await db.query(
      `SELECT lichess_id
         FROM chesscup.chesscup_users
        WHERE access_token = $1`,
      [token]
    );
    if (userQ.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const lichessId = userQ.rows[0].lichess_id;

    // 3) Лучший результат за всё время в этом режиме
    const allTimeQ = await db.query(
      `SELECT COALESCE(MAX(points), 0) AS best
         FROM chesscup.user_points_history
        WHERE lichess_id = $1
          AND mode      = $2`,
      [lichessId, mode]
    );
    const bestAllTime = allTimeQ.rows[0].best;

    // 4) Лучший результат за сегодня в этом режиме
    const todayQ = await db.query(
      `SELECT COALESCE(MAX(points), 0) AS best
         FROM chesscup.user_points_history
        WHERE lichess_id  = $1
          AND mode        = $2
          AND recorded_at >= date_trunc('day', now())`,
      [lichessId, mode]
    );
    const bestToday = todayQ.rows[0].best;

    // 5) Отдаём ответ
    return res.json({
      record: {
        today: bestToday,
        allTime: bestAllTime,
      },
    });
  } catch (err) {
    console.error('Error in GET /puzzles/record:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * [GET] /puzzles/:puzzleid
 * Path‑параметр: puzzleid
 */
router.get('/:puzzleid', async (req, res) => {
  const { puzzleid } = req.params;
  try {
    // Запрашиваем конкретный пазл у puzzles‑API
    const response = await axios.get(
      `${PUZZLES_API}/puzzles/${encodeURIComponent(puzzleid)}`,
      { headers: { Accept: 'application/json' } }
    );
    return res.json(response.data);
  } catch (err) {
    console.error('Error in GET /puzzles/:puzzleid:', err);
    // если внешний сервис вернул 404
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }
    // другие ошибки сети/сервиса
    if (err.isAxiosError) {
      return res.status(502).json({
        error: 'Failed to fetch puzzle from external service.',
      });
    }
    // всё остальное
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

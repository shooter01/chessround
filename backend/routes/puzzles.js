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
  const { level, theme, limit } = req.query;

  // if (!level || !limit) {
  //   return res.status(400).json({
  //     error: 'Missing required query parameters: level, limit.',
  //   });
  // }

  // 1) Извлекаем токен
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.slice(7);

  try {
    // 2) Получаем lichess_id из users
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

    // 3) Запрашиваем список паззлов
    const response = await axios.get(`${PUZZLES_API}/puzzles`, {
      // params: { level, theme, limit },
      headers: { Accept: 'application/json' },
    });
    const puzzles = response.data;

    // 4) UPSERT в chesscup_sessions по lichess_id
    const upsertRes = await db.query(
      `INSERT INTO chesscup.chesscup_sessions (lichess_id, puzzles)
       VALUES ($1, $2)
       ON CONFLICT (lichess_id)
       DO UPDATE
         SET puzzles     = EXCLUDED.puzzles,
             updated_at  = now(),
             session_id  = gen_random_uuid()
       RETURNING session_id`,
      [lichessId, JSON.stringify(puzzles)]
    );
    const sessionId = upsertRes.rows[0].session_id;

    // 5) Если level = 1, сбрасываем points в 0
    if (Number(level) === 1) {
      await db.query(
        `UPDATE chesscup.chesscup_sessions
            SET current_session_points = 0,
                current_session_puzzle_index = 0,
                updated_at            = now()
          WHERE session_id = $1`,
        [sessionId]
      );
    }

    // 6) Возвращаем паззлы и session_id
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
      return res
        .status(502)
        .json({
          error: 'Failed to fetch puzzle from external service.',
        });
    }
    // всё остальное
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * [POST] /puzzles/solve
 * BODY: { fen: string, moves: string, session_id: string }
 * Заголовок: Authorization: Bearer <token>
 */
router.post('/solve', async (req, res) => {
  const { fen, moves, session_id: sessionIdFromBody } = req.body;

  // 1) Валидация входных данных
  if (!fen || typeof moves !== 'string' || !sessionIdFromBody) {
    return res
      .status(400)
      .json({ error: 'Missing fen, moves or session_id in body' });
  }

  // 2) Проверяем заголовок авторизации
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.slice(7);

  try {
    // 3) Определяем lichess_id по токену
    const userRes = await db.query(
      `SELECT lichess_id
         FROM chesscup.chesscup_users
        WHERE access_token = $1`,
      [token]
    );
    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const lichessId = userRes.rows[0].lichess_id;

    // 4) Достаём сессию по lichess_id и session_id
    const sessRes = await db.query(
      `SELECT session_id,
              puzzles,
              current_session_puzzle_index,
              current_session_points
         FROM chesscup.chesscup_sessions
        WHERE lichess_id = $1
          AND session_id = $2`,
      [lichessId, sessionIdFromBody]
    );
    if (sessRes.rowCount === 0) {
      return res
        .status(400)
        .json({ error: 'Invalid or expired session_id' });
    }
    const {
      session_id: sessionId,
      puzzles: puzzlesText,
      current_session_puzzle_index: currentIndex,
      current_session_points: currentPoints,
    } = sessRes.rows[0];

    // 5) Парсим puzzles и находим индекс текущего паззла
    let puzzles;
    try {
      puzzles = JSON.parse(puzzlesText);
    } catch {
      return res
        .status(500)
        .json({ error: 'Invalid puzzles format in DB' });
    }
    const idx = puzzles.findIndex((p) => p.fen === fen);
    if (idx === -1) {
      return res.status(400).json({
        error: 'Puzzle with given fen not found in session',
      });
    }

    // 6) Вычисляем новый индекс и очки
    const newIndex = idx === currentIndex ? currentIndex + 1 : idx;
    const correctMoves = puzzles[idx].moves;
    const gainedPoint = moves === correctMoves ? 1 : 0;
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

    // 8) Возвращаем обновлённые данные
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

module.exports = router;

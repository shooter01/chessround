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

// [GET] /puzzles/get?mode=3m&theme=fork&rating=1500
router.get('/get', async (req, res) => {
  let { mode = '3m', theme = '', rating = '0' } = req.query;

  // --- 0) Нормализуем mode ---
  if (mode === '3' || mode === '5') mode += 'm';
  const allowedModes = ['3m', '5m', 'survival'];
  if (!allowedModes.includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode parameter' });
  }

  // --- 1) Валидируем rating ---
  const allowedRatings = [0, 1500, 2000, 2500];
  const parsedRating = parseInt(rating, 10);
  const finalRating = allowedRatings.includes(parsedRating)
    ? parsedRating
    : 0;

  // --- 2) Валидируем theme ---
  const finalTheme =
    typeof theme === 'string' ? theme.slice(0, 50) : '';

  // Внутренняя функция для запроса к puzzles-API
  async function fetchPuzzles() {
    const response = await axios.get(`${PUZZLES_API}/puzzles`, {
      headers: { Accept: 'application/json' },
      params: {
        ...(finalTheme && { theme: finalTheme }),
        ...(finalRating > 0 && { rating: finalRating }),
      },
    });
    return response.data;
  }

  // --- 3) Пытаемся авторизовать по Bearer ---
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    try {
      const userQ = await db.query(
        `SELECT lichess_id
           FROM chesscup.chesscup_users
          WHERE access_token = $1`,
        [token]
      );
      if (userQ.rowCount > 0) {
        const lichessId = userQ.rows[0].lichess_id;
        const puzzles = await fetchPuzzles();

        // 4) UPSERT сессии для авторизованного
        const upsertSql = `
          INSERT INTO chesscup.chesscup_sessions
            (lichess_id, puzzles, mode, theme, rating)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (lichess_id)
          DO UPDATE SET
            puzzles                      = EXCLUDED.puzzles,
            mode                         = EXCLUDED.mode,
            theme                        = EXCLUDED.theme,
            rating                       = EXCLUDED.rating,
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
          finalTheme || null,
          finalRating || null,
        ]);
        const sessionId = upsertRes.rows[0].session_id;
        return res.json({ puzzles, session_id: sessionId });
      }
    } catch (err) {
      console.error('Error in /puzzles/get (auth):', err);
      // fall through to guest flow
    }
  }

  // --- 5) Гостевой поток: без session_id ---
  try {
    const puzzles = await fetchPuzzles();
    return res.json({ puzzles, session_id: null });
  } catch {
    console.error('Error in /puzzles/get (public):');
    return res.status(502).json({
      error: 'Failed to fetch puzzles from external service.',
    });
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
    // 1. Получаем lichess_id по токену
    const userRes = await db.query(
      `SELECT lichess_id FROM chesscup.chesscup_users WHERE access_token = $1`,
      [token]
    );
    if (!userRes.rowCount) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const lichessId = userRes.rows[0].lichess_id;

    // 2. Загружаем сессию вместе с mode, theme, rating
    const sessRes = await db.query(
      `SELECT session_id,
              puzzles,
              current_session_puzzle_index,
              current_session_points,
              mode,
              theme,
              rating
         FROM chesscup.chesscup_sessions
        WHERE lichess_id = $1
          AND session_id = $2`,
      [lichessId, sessionIdFromBody]
    );

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
      theme,
      rating,
    } = sessRes.rows[0];

    // 3. Парсим пазлы
    let puzzles;
    try {
      puzzles = JSON.parse(puzzlesText).puzzles;
    } catch {
      return res
        .status(500)
        .json({ error: 'Invalid puzzles format in DB' });
    }

    // 4. Находим индекс текущего
    const idx = puzzles.findIndex((p) => p.fen === fen);
    if (idx === -1) {
      return res
        .status(400)
        .json({ error: 'Puzzle not found in session' });
    }

    // 5. Обновляем индекс и очки
    const newIndex = idx === currentIndex ? currentIndex + 1 : idx;
    const gainedPoint = moves === puzzles[idx].moves ? 1 : 0;
    const newPoints = currentPoints + gainedPoint;

    await db.query(
      `UPDATE chesscup.chesscup_sessions
          SET current_session_puzzle_index = $1,
              current_session_points       = $2,
              updated_at                   = now()
        WHERE session_id = $3`,
      [newIndex, newPoints, sessionId]
    );

    // 6. Логируем историю (расширим потом, если нужно будет)
    await db.query(
      `INSERT INTO chesscup.user_points_history
     (session_id, lichess_id, points, mode, theme, rating)
   VALUES ($1, $2, $3, $4, $5, $6)
   ON CONFLICT (session_id)
   DO UPDATE SET
     points      = EXCLUDED.points,
     mode        = EXCLUDED.mode,
     theme       = EXCLUDED.theme,
     rating      = EXCLUDED.rating,
     recorded_at = now()`,
      [
        sessionId,
        lichessId,
        newPoints,
        mode,
        theme || null,
        rating || null,
      ]
    );

    // 7. Отдаём результат
    return res.json({
      session_id: sessionId,
      current_index: newIndex,
      current_points: newPoints,
      mode,
      theme,
      rating,
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

router.get('/themes', async (req, res) => {
  try {
    const response = await axios.get(`${PUZZLES_API}/themes`, {
      headers: { Accept: 'application/json' },
    });
    return res.json(response.data);
  } catch (err) {
    console.error('Error in GET /themes:', err);
    return res.status(502).json({ error: 'Failed to fetch themes' });
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

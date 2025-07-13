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

// router.use(checkJwt);

/**
 * [GET] /puzzles/get?level=5&theme=fork&limit=2
 */
router.get('/get', checkJwt, async (req, res) => {
  console.log(req.session);

  const { level, theme, limit } = req.query;

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res
      .status(401)
      .json({ message: 'Missing Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res
      .status(402)
      .json({ message: 'Invalid Authorization header format' });
  }

  console.log(token);

  const result = await db.query(
    'SELECT lichess_id FROM chesscup.chesscup_users WHERE access_token = $1',
    [token]
  );
  console.log(token);

  // if (result.rowCount === 0) {
  //   return res
  //     .status(403)
  //     .json({ message: 'Invalid or expired token' });
  // }
  console.log(result.rows[0]);

  // // if (!level || !theme || !limit) {
  // if (!level || !limit) {
  //   return res.status(400).json({
  //     error: 'Missing required query parameters: level, limit.',
  //   });
  // }

  // const auth = req.headers.authorization;
  // if (!auth || !auth.startsWith('Bearer ')) {
  //   return res
  //     .status(401)
  //     .json({ error: 'Missing Authorization header' });
  // }
  // // const token = auth.slice('Bearer '.length);
  // console.log(token);

  try {
    const response = await axios.get(
      'https://dofrag.com/db/puzzles',
      {
        params: { level, theme, limit },
        headers: { Accept: 'application/json' },
      }
    );
    // не деструктурируем { puzzles } — сам ответ в data
    const puzzles = response.data;

    console.log(req.user, { level, theme: 'fork', limit });

    //Determine user identity (from JWT or session)
    // Assuming checkJwt populates req.user. Adjust according to your auth.
    // const lichessId = req.user?.lichessId;
    // if (!lichessId) {
    //   return res.status(401).json({ error: 'Unauthorized' });
    // }

    // if (level == 1) {
    //   await db.query(
    //     `UPDATE chesscup.chesscup_sessions
    //         SET current_session_puzzle_index = $1,
    //             current_session_points       = $2,
    //             updated_at                   = now()
    //       WHERE session_id = $3`,
    //     [newIndex, newPoints, sessionId]
    //   );
    // }

    // First try update
    const updateResult = await db.query(
      `UPDATE chesscup.chesscup_sessions
            SET puzzles = $1,
                updated_at = now(),
                session_id = gen_random_uuid()
          WHERE lichess_id = $2
          RETURNING session_id`,
      [JSON.stringify(puzzles), result.rows[0].lichess_id]
    );

    let sessionId;
    if (updateResult.rowCount > 0) {
      sessionId = updateResult.rows[0].session_id;
    } else {
      // Insert new session
      const insertResult = await db.query(
        `INSERT INTO chesscup.chesscup_sessions
             (lichess_id, puzzles)
           VALUES($1, $2)
           RETURNING session_id`,
        [result.rows[0].lichess_id, JSON.stringify(puzzles)]
      );
      sessionId = insertResult.rows[0].session_id;
    }

    // Return puzzles and session_id
    return res.status(200).json({ puzzles, session_id: sessionId });
    // return res.status(200).json({ puzzles: [] });
  } catch (error) {
    console.error(
      'Error fetching puzzles from dofrag:',
      error.message
    );
    return res.status(502).json({
      error: 'Failed to fetch puzzles from external service.',
    });
  }
});

/**
 * [POST] /puzzles/solve
 * Body: { fen: string, moves: string }  // moves как строка, точно так же, как в puzzles[i].moves
 * Header: Authorization: Bearer <token>
 */
router.post('/solve', async (req, res) => {
  const { fen, moves } = req.body;
  if (!fen || typeof moves !== 'string') {
    return res
      .status(400)
      .json({ error: 'Missing fen or moves in body' });
  }

  // 1) Извлекаем token
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.slice(7);

  try {
    // 2) Находим lichess_id
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

    // 3) Берём текущую сессию вместе с индексом и очками
    const sessRes = await db.query(
      `SELECT session_id,
              puzzles,
              current_session_puzzle_index,
              current_session_points
         FROM chesscup.chesscup_sessions
        WHERE lichess_id = $1`,
      [lichessId]
    );
    if (sessRes.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const {
      session_id: sessionId,
      puzzles: puzzlesText,
      current_session_puzzle_index: currentIndex,
      current_session_points: currentPoints,
    } = sessRes.rows[0];

    // 4) Парсим puzzles и находим индекс по fen
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

    // 5) Логика инкремента:
    // Если найденный idx совпадает с тем, что в currentIndex — значит
    // пользователь решил текущий паззл, и мы двигаем указатель вперёд
    const newIndex = idx === currentIndex ? currentIndex + 1 : idx;

    // Если moves совпадают с эталонными ходами — даём +1 очко
    const correctMoves = puzzles[idx].moves; // строка из БД
    const gainedPoint = moves === correctMoves ? 1 : 0;
    const newPoints = currentPoints + gainedPoint;

    // 6) Обновляем сессию
    await db.query(
      `UPDATE chesscup.chesscup_sessions
          SET current_session_puzzle_index = $1,
              current_session_points       = $2,
              updated_at                   = now()
        WHERE session_id = $3`,
      [newIndex, newPoints, sessionId]
    );

    // 7) Ответ клиенту
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

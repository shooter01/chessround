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
 * [GET] /leaderboard?range=daily|weekly|all
 * Для каждого lichess_id берёт наивысший points в диапазоне,
 * сортирует по этим наивысшим и отдает топ‑50.
 */
router.get('/', async (req, res) => {
  const { range = 'all', mode = '3m' } = req.query;
  let dateCond = '';
  if (range === 'daily') {
    dateCond = `AND recorded_at >= date_trunc('day', now())`;
  } else if (range === 'weekly') {
    dateCond = `AND recorded_at >= date_trunc('week', now())`;
  }

  const sql = `
    SELECT
      lichess_id,
      MAX(points) AS best_score
    FROM chesscup.user_points_history
    WHERE mode = $1
      ${dateCond}
    GROUP BY lichess_id
    ORDER BY best_score DESC
    LIMIT 50
  `;
  try {
    const { rows } = await db.query(sql, [mode]);
    const players = rows.map((r, i) => ({
      rank: i + 1,
      lichessId: r.lichess_id,
      score: r.best_score,
    }));
    res.json(players);
  } catch (err) {
    console.error('GET /leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

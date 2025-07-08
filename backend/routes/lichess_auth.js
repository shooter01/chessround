// routes/lichess_auth.js
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { Pool } = require('pg');
var jwt = require('jsonwebtoken');
const lichessCredentials = require('./utils/lichess_credentials');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Базовый URL вашего бэка, без слеша на конце
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Единый путь коллбэка
const CALLBACK_PATH = '/lichess_auth/callback';

// Полный URI должен совпадать в /auth и при обмене
const REDIRECT_URI = BASE_URL + CALLBACK_PATH;

const CLIENT_ID =
  process.env.LICHESS_CLIENT_ID || lichessCredentials.clientId;
const STATE_SECRET = process.env.STATE_SECRET || 'test';

// base64url-encode без padding
function base64URLEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Генерация PKCE verifier & challenge
function generatePKCECodes() {
  const verifier = base64URLEncode(crypto.randomBytes(32));
  const challenge = base64URLEncode(
    crypto.createHash('sha256').update(verifier).digest()
  );
  return { verifier, challenge };
}

// 1️⃣ Начало OAuth-flow: генерим PKCE, сохраняем verifier+state в сессии, возвращаем URI
router.get('/auth', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const { verifier, challenge } = generatePKCECodes();

  req.session.codeVerifier = verifier;
  req.session.oauthState = state;

  const payload = {
    cv: verifier, // ваш PKCE-verifier
    iat: Math.floor(Date.now() / 1000),
  };
  const token = jwt.sign(payload, 'test', {
    expiresIn: '15m',
  });
  const stateToken = jwt.sign({ cv: verifier }, STATE_SECRET, {
    expiresIn: '5m',
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: stateToken,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  const authorizationUri = `https://lichess.org/oauth?${params.toString()}`;
  res.json({ authorizationUri });
});

// 2️⃣ Callback: обмениваем code+verifier на токен и сохраняем в БД
// 2️⃣ /callback — получаем код, расшифровываем state, меняем на токен
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state)
      return res.status(400).send('Missing code or state');

    let payload;
    try {
      payload = jwt.verify(state, STATE_SECRET);
    } catch {
      return res.status(400).send('Invalid or expired state');
    }
    const codeVerifier = payload.cv;
    if (!codeVerifier)
      return res.status(400).send('Invalid state payload');

    // Обмен кода на токен — ОБЯЗАТЕЛЬНО /api/token
    const tokenResp = await axios.post(
      'https://lichess.org/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    const accessToken = tokenResp.data.access_token;

    // Запрашиваем профиль
    const userResp = await axios.get(
      'https://lichess.org/api/account',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const lichessId = userResp.data.username;

    // Upsert в базу
    const clientDb = await pool.connect();
    try {
      const upd = await clientDb.query(
        `UPDATE chesscup.chesscup_users
            SET access_token = $1, updated_at = now()
          WHERE lichess_id = $2`,
        [accessToken, lichessId]
      );
      if (upd.rowCount === 0) {
        await clientDb.query(
          `INSERT INTO chesscup.chesscup_users (lichess_id, access_token)
           VALUES ($1, $2)`,
          [lichessId, accessToken]
        );
      }
    } finally {
      clientDb.release();
    }

    res.cookie('lichess_token', accessToken, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 дней
      sameSite: 'lax',
    });

    res.redirect(process.env.FRONTEND_URL || '/');
  } catch (err) {
    console.error(
      'Lichess OAuth callback error:',
      err.response || err
    );
    res.status(500).send('Authentication failed');
  }
});

router.get('/user', async (req, res) => {
  try {
    const token = req.cookies['lichess_token'];
    if (!token) return res.status(401).send('Not authenticated');

    // Проверим, что такой токен есть в БД
    const clientDb = await pool.connect();
    let dbCheck;
    try {
      dbCheck = await clientDb.query(
        `SELECT lichess_id FROM chesscup.chesscup_users WHERE access_token = $1`,
        [token]
      );
    } finally {
      clientDb.release();
    }
    if (!dbCheck.rows.length)
      return res.status(401).send('Invalid token');

    // Получим свежий профиль из Lichess
    const userResp = await axios.get(
      'https://lichess.org/api/account',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.json(userResp.data);
  } catch (err) {
    console.error('/user error', err.response || err);
    res.status(500).send('Failed to fetch user');
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('lichess_token', {
    sameSite: 'lax',
    httpOnly: true,
  });
  res.sendStatus(200);
});

module.exports = router;

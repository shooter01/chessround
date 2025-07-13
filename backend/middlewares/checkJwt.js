// checkJwt.js
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const publicKey = fs.readFileSync(
  path.join(__dirname, '../public.pem'), // Путь к вашему публичному ключу
  'utf8'
);

const checkJwt = async (req, res, next) => {
  // Skip auth and session check for GET /puzzles/get when level=1
  if (
    req.method === 'GET' &&
    req.originalUrl.startsWith('/puzzles/get') &&
    req.query.level === '1'
  ) {
    return next();
  }

  console.log(req.headers.authorization);

  // 1. Check Authorization header
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

  // 2. Optionally check Session-Id header presence, except for GET /puzzles/get
  const skipSessionCheck =
    req.method === 'GET' &&
    req.originalUrl.startsWith('/puzzles/get');
  if (!skipSessionCheck) {
    const sessionId = req.headers['session-id'];
    if (!sessionId) {
      return res
        .status(400)
        .json({ message: 'Missing Session-Id header' });
    }
    req.sessionId = sessionId;
  }

  try {
    // 3. Verify token exists in database
    const result = await db.query(
      'SELECT lichess_id FROM chesscup_users WHERE access_token = $1',
      [token]
    );
    if (result.rowCount === 0) {
      return res
        .status(403)
        .json({ message: 'Invalid or expired token' });
    }

    // Attach user identifier
    // req.session.user = { lichessId: result.rows[0].lichess_id };
    next();
  } catch (error) {
    console.error('Token lookup failed:', error.message || error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = checkJwt;

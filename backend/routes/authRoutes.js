const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const publicKey = fs.readFileSync(
  path.join(__dirname, '../public.pem'),
  'utf8'
);

// Middleware для проверки JWT
const checkJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ message: 'Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
    });

    // Добавляем userId в объект req
    req.user = decoded;
    req.userId = decoded.sub || decoded.userId || decoded.id;

    if (!req.userId) {
      return res
        .status(403)
        .json({ message: 'Invalid token: userId not found' });
    }

    next();
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return res
      .status(403)
      .json({ message: 'Invalid or expired token' });
  }
};

// Защищённый маршрут для проверки
router.get('/protected', checkJwt, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

module.exports = { router, checkJwt };

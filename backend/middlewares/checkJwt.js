// checkJwt.js
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const publicKey = fs.readFileSync(
  path.join(__dirname, '../public.pem'), // Путь к вашему публичному ключу
  'utf8'
);

const checkJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ message: 'Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Декодируем токен
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
    });

    // Извлекаем нужные поля из Keycloak-токена
    const userId = decoded.sub;
    const username = decoded.preferred_username;
    const userEmail = decoded.email;

    // Роли (если настроены). Например, из realm_access:
    const roles = decoded.realm_access?.roles || [];

    // Сохраняем их в req.user (или куда угодно)
    req.user = {
      id: userId,
      username,
      email: userEmail,
      roles,
      // Можете добавить и другие поля из токена
    };

    // Если нужно конкретно userId
    req.userId = userId;

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

module.exports = checkJwt;

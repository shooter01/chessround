const db = require('../db');

/**
 * Логирует активность в таблице activity_feed.
 * @param {Object} params - Параметры активности.
 * @param {string} params.userId - Идентификатор пользователя.
 * @param {string} params.action - Описание действия.
 * @param {string} [params.target] - Цель действия (например, email или workflow).
 */
const logActivity = async ({ userId, action, target = null }) => {
  try {
    await db.query(
      'INSERT INTO activity_feed (user_id, action, target) VALUES ($1, $2, $3)',
      [userId, action, target]
    );
    console.log('Activity logged:', { userId, action, target });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

module.exports = { logActivity };

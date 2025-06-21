const express = require('express');
const router = express.Router();
const db = require('../db');
const checkJwt = require('../middlewares/checkJwt');
const {
  sendTelegramMessage,
  sendEmailFromDB,
} = require('../services/notifications');
const { formatMessage } = require('./utils/formatMessage');

router.use(checkJwt);

/**
 * Функция для подстановки данных из payload в сообщение
 */

/**
 * [POST] Триггер для выполнения workflow
 */
router.post('/trigger', async (req, res) => {
  const { apiKey, name, to, payload } = req.body;

  if (!apiKey || !name || !to || !to.email) {
    return res
      .status(400)
      .json({ error: 'Missing required fields.' });
  }

  try {
    const apiKeyResult = await db.query(
      'SELECT * FROM api_keys WHERE "key" = $1 LIMIT 1',
      [apiKey]
    );

    if (apiKeyResult.rows.length === 0) {
      return res.status(403).json({ error: 'Invalid API Key.' });
    }

    const workflowResult = await db.query(
      'SELECT * FROM workflows WHERE name = $1 LIMIT 1',
      [name]
    );

    if (workflowResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found.' });
    }

    const workflowId = workflowResult.rows[0].id;
    const userId = workflowResult.rows[0].user_id;

    const stepsResult = await db.query(
      'SELECT * FROM workflow_steps WHERE workflow_id = $1 ORDER BY id ASC',
      [workflowId]
    );
    const steps = stepsResult.rows;

    const errors = [];

    for (const step of steps) {
      const messageResult = await db.query(
        'SELECT message FROM workflow_step_messages WHERE step_id = $1 LIMIT 1',
        [step.id]
      );
      let message =
        messageResult.rows.length > 0
          ? messageResult.rows[0].message
          : 'Default message';

      console.log(`🚀 Исходное сообщение: ${message}`);
      console.log(`📩 Payload:`, JSON.stringify(payload, null, 2));

      message = formatMessage(message, { payload });
      console.log(`✅ Обработанное сообщение: ${message}`);

      if (step.step_name.toLowerCase() === 'telegram') {
        const integrationResult = await db.query(
          'SELECT bot_token, chat_id FROM integrations WHERE user_id = $1 AND channel = $2 LIMIT 1',
          [userId, 'telegram']
        );

        if (
          integrationResult.rows.length === 0 ||
          !integrationResult.rows[0].chat_id ||
          !integrationResult.rows[0].bot_token
        ) {
          const errorMsg = `❌ Ошибка: bot_token или chat_id не найдены для пользователя ${userId}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          continue;
        }

        const { bot_token, chat_id } = integrationResult.rows[0];

        const err = await sendTelegramMessage({
          botToken: bot_token,
          chatId: chat_id,
          text: message,
        });
        if (err) errors.push(err);
      } else if (step.step_name.toLowerCase() === 'email') {
        const err = await sendEmailFromDB(
          userId,
          to.email,
          name,
          message
        );
        if (err) errors.push(err);
      } else if (step.step_name.toLowerCase() === 'inapp') {
        console.log(
          `In-App notification triggered with message: ${message}`
        );
      } else {
        const warning = `⚠️ Unknown step type: ${step.step_name}`;
        console.warn(warning);
        errors.push(warning);
      }
    }

    if (errors.length > 0) {
      return res.status(500).json({ errors });
    }

    res
      .status(200)
      .json({ message: 'Workflow triggered successfully.' });
  } catch (error) {
    console.error('Error triggering workflow:', error);
    res.status(500).json({ error: 'Failed to trigger workflow.' });
  }
});

module.exports = router;

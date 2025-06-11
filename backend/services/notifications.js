const axios = require('axios');

const nodemailer = require('nodemailer');
const db = require('../db');

/**
 * Отправка сообщения в Telegram
 */
async function sendTelegramMessage({ botToken, chatId, text }) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  console.log(`🛠️ Отправка запроса в Telegram API: ${url}`);
  console.log(`📩 Параметры: chat_id=${chatId}, text=${text}`);

  if (!botToken) {
    const errorMsg = '❌ Ошибка: botToken не передан!';
    console.error(errorMsg);
    return errorMsg;
  }

  if (!chatId) {
    const errorMsg = '❌ Ошибка: chatId не передан!';
    console.error(errorMsg);
    return errorMsg;
  }

  try {
    const response = await axios.post(url, { chat_id: chatId, text });
    console.log(`✅ Telegram message sent to ${chatId}`);
    return null; // успех — возвращаем null
  } catch (error) {
    // Собираем подробную информацию об ошибке:
    const status = error?.response?.status;
    const data = error?.response?.data;
    const statusText = error?.response?.statusText;

    // Можно выводить как единый текст или как JSON
    const errorMsg = `
❌ Ошибка отправки в Telegram:
  URL: ${url}
  Параметры: chat_id=${chatId}, text=${text}
  StatusCode: ${status || 'Нет информации о статусе'}
  StatusText: ${statusText || 'Нет статуса'}
  Response data: ${JSON.stringify(data) || 'Нет данных'}
  Error message: ${error.message}
  Stack: ${error.stack}
    `.trim();

    console.error(errorMsg);
    return errorMsg;
  }
}
async function sendEmailFromDB(userId, to, subject, text) {
  let host, port, user;

  try {
    const integrationResult = await db.query(
      'SELECT host, port, "user", "password" FROM integrations WHERE user_id = $1 AND channel = $2 LIMIT 1',
      [userId, 'email']
    );

    if (integrationResult.rows.length === 0) {
      const errorMsg = `❌ Ошибка: не найдены SMTP-настройки для пользователя ${userId}`;
      console.error(errorMsg);
      return errorMsg;
    }

    ({ host, port, user, password } = integrationResult.rows[0]);

    console.log(
      `📩 Используем SMTP: host=${host}, port=${port}, user=${user}`
    );

    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: {
        user,
        pass: password,
      },
    });

    const mailOptions = {
      from: 'shooter@mail.ru',
      to,
      subject,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent: ${info.messageId}`);
    return null;
  } catch (error) {
    const errorMsg = `
❌ Ошибка отправки email:
  HOST: ${host || 'неизвестно'}
  PORT: ${port || 'неизвестно'}
  USER: ${user || 'неизвестно'}
  Subject: ${subject}
  To: ${to}
  Error message: ${error.message}
  Stack: ${error.stack}
    `.trim();

    console.error(errorMsg);
    return errorMsg;
  }
}

module.exports = {
  sendTelegramMessage,
  sendEmailFromDB,
};

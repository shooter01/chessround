const express = require('express');
const cors = require('cors'); // Импорт CORS
const checkJwt = require('./middlewares/checkJwt');

const { router: authRoutes } = require('./routes/authRoutes'); // Импортируем router из authRoutes
const api = require('./routes/api'); // Убедитесь, что путь корректный

const app = express();
const PORT = 5000;

app.use(express.json());
// Настройка CORS
app.use(cors());
// app.use(checkJwt);
// app.use(
//   cors({
//     origin: 'http://localhost:3000', // Разрешённый источник (ваш фронтенд)
//     methods: ['GET', 'POST'], // Разрешённые HTTP-методы
//     allowedHeaders: ['Authorization', 'Content-Type'], // Разрешённые заголовки
//   })
// );

// Middleware для проверки JWT токенов
// Подключаем маршруты
app.use('/auth', authRoutes); // Все маршруты из authRoutes будут начинаться с /auth
app.use('/api', api);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

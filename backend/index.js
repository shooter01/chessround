const express = require('express');
const cors = require('cors'); // Импорт CORS
const checkJwt = require('./middlewares/checkJwt');
const session = require('express-session');

const { router: authRoutes } = require('./routes/authRoutes'); // Импортируем router из authRoutes
const api = require('./routes/api'); // Убедитесь, что путь корректный
const lichess_auth = require('./routes/lichess_auth'); // Убедитесь, что путь корректный
const puzzles = require('./routes/puzzles'); // Убедитесь, что путь корректный
const leaderboard = require('./routes/leaderboard');
const tournaments = require('./routes/tournaments');

const cookieParser = require('cookie-parser');

const app = express();
// Middleware для сессий (PKCE будем хранить в req.session)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: true,
  })
);

const PORT = 5000;
app.use(cookieParser());

app.use(
  session({
    secret: 'a very secret string', // <-- change this to a real secret
    resave: false, // don't save if unmodified
    saveUninitialized: true, // save new but uninitialized sessions
    cookie: {
      secure: false, // set to true if you serve over HTTPS
      maxAge: 1000 * 60 * 15, // optional: session expires in 15m
    },
  })
);

app.use(express.json());
// Настройка CORS
app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  })
);
// app.use(cors());
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
app.use('/lichess_auth', lichess_auth);
app.use('/puzzles', puzzles);
app.use('/leaderboard', leaderboard);
app.use('/tournaments', tournaments);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

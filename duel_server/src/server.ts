import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';
import axios from 'axios';

import {
  waitRedisReady,
  withStartupLock,
  purgePresenceNamespace,
} from './presence-cleanup.ts';

const PORT = parseInt(process.env.PORT || '8080', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 15000,
  pingTimeout: 25000,
});
const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL || 'http://localhost:5000';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Redis для масштабирования и хранения онлайна
const pub = new Redis(REDIS_URL);
const sub = new Redis(REDIS_URL);
io.adapter(createAdapter(pub, sub));

// Ключи в Redis
const lobbyMembersKey = (lobbyId: string) =>
  `lobby:${lobbyId}:members`; // SET userId
const lobbyUserSocketsKey = (lobbyId: string, userId: string) =>
  `lobby:${lobbyId}:user:${userId}:sockets`; // SET socketId
const lobbyUsersInfoKey = (lobbyId: string) =>
  `lobby:${lobbyId}:usersInfo`; // HSET userId -> JSON

type AuthPayload = { userId?: string; name?: string };
function getAuth(socket: any): AuthPayload {
  // client передаёт { auth: { token? userId? name? } }
  const a = socket.handshake.auth || {};
  // В реале проверьте JWT и извлеките userId
  const userId = a.userId || randomUUID(); // гостю выдаём uuid
  const name = a.name || `guest-${userId.slice(0, 6)}`;
  return { userId, name };
}

function makeShortId(len = 8) {
  const alphabet =
    '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let s = '';
  for (let i = 0; i < len; i++)
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

// Кто сейчас ищет (по лобби)
async function getOpenSearches(lobbyId: string) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, user_id, username, rating, tc_seconds, inc_seconds, created_at
         FROM chesscup.duel_searches
        WHERE lobby_id = $1 AND status = 'open'
        ORDER BY created_at ASC`,
      [lobbyId]
    );
    return rows;
  } finally {
    client.release();
  }
}

async function broadcastMmSnapshot(lobbyId: string) {
  const room = `lobby:${lobbyId}`;
  const list = await getOpenSearches(lobbyId);
  io.to(room).emit('mm:snapshot', { lobbyId, list });
}

type EffortItem = {
  idx: number;
  pid: string;
  fen: string;
  correct: boolean;
  at: string;
};
type ProgressMap = {
  scores: Record<string, number>;
  currentIndex: Record<string, number>;
  efforts: Record<string, EffortItem[]>;
};

async function findPuzzleIndexByFen(gameId: string, fen: string) {
  const { rows } = await pool.query(
    `SELECT puzzles FROM chesscup.duel_games WHERE id = $1`,
    [gameId]
  );
  const payload = rows[0]?.puzzles;
  const list: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.puzzles)
    ? payload.puzzles
    : Array.isArray(payload?.puzzles?.puzzles)
    ? payload.puzzles.puzzles
    : [];
  const idx = list.findIndex((p) => p?.fen === fen);
  const pid =
    idx >= 0
      ? list[idx]?.puzzle_id ?? list[idx]?.id ?? String(idx)
      : null;
  return { idx, pid };
}

function toEffortJSONB(
  idx: number,
  pid: string,
  fen: string,
  correct: boolean
) {
  // строим jsonb одним выражением в SQL (см. ниже)
  return { idx, pid, fen, correct };
}

async function buildProgressFromPlayers(
  gameId: string
): Promise<ProgressMap> {
  const { rows } = await pool.query(
    `SELECT user_id, points, efforts
       FROM chesscup.duel_game_players
      WHERE game_id = $1`,
    [gameId]
  );

  const progress: ProgressMap = {
    scores: {},
    currentIndex: {},
    efforts: {},
  };
  for (const r of rows) {
    const uid = r.user_id as string;
    const effArr: EffortItem[] = Array.isArray(r.efforts)
      ? r.efforts
      : [];
    progress.scores[uid] = Number(r.points ?? 0);
    progress.currentIndex[uid] = effArr.length;
    progress.efforts[uid] = effArr;
  }
  return progress;
}

type PlayerRow = {
  user_id: string;
  username: string;
  color: 'w' | 'b';
  rating_pre: number | null;
  points: number;
  efforts: any[]; // JSONB array
};
type GameRow = {
  id: string;
  short_id: string;
  lobby_id: string;
  status: string;
  tc_seconds: number;
  inc_seconds: number;
  puzzles: any | null;
};

async function getGameByShortId(
  shortId: string
): Promise<GameRow | null> {
  const { rows } = await pool.query<GameRow>(
    `SELECT id, short_id, lobby_id, status, tc_seconds, inc_seconds, puzzles
       FROM chesscup.duel_games
      WHERE short_id = $1`,
    [shortId]
  );
  return rows[0] ?? null;
}

async function getGamePlayers(gameId: string): Promise<PlayerRow[]> {
  const { rows } = await pool.query<PlayerRow>(
    `SELECT user_id, username, color, rating_pre, points, efforts
       FROM chesscup.duel_game_players
      WHERE game_id = $1
      ORDER BY color ASC`,
    [gameId]
  );
  return rows;
}

function gatePlay(socket: any, cb?: Function): boolean {
  if (socket.data?.isGuest) {
    const err = {
      code: 'GUEST_FORBIDDEN',
      message: 'Гостям нельзя играть. Войдите в аккаунт.',
    };
    if (typeof cb === 'function') cb(err);
    else socket.emit('error', err);
    return false;
  }
  return true;
}

function tcToMode(tc: number): '3m' | '5m' | 'survival' {
  if (tc >= 295 && tc <= 305) return '5m';
  if (tc >= 175 && tc <= 185) return '3m';
  return 'survival';
}

async function fetchAndSaveGamePuzzles(opts: {
  gameId: string;
  tcSeconds: number;
  incSeconds: number;
  rating?: number | null;
  theme?: string | null;
}) {
  const mode = tcToMode(opts.tcSeconds);
  const params: any = { mode };
  if (opts.rating && opts.rating > 0) params.rating = opts.rating;
  if (opts.theme) params.theme = opts.theme;

  let data: any;
  // до 5 попыток с бэкоффом
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const resp = await axios.get(
        `${BACKEND_BASE_URL}/puzzles/get`,
        {
          params,
          headers: { Accept: 'application/json' },
          timeout: 5000,
        }
      );
      data = resp.data;
      break;
    } catch (e: any) {
      if (attempt === 5) throw e;
      await sleep(400 * attempt); // 400ms, 800ms, ...
    }
  }

  const puzzlesPayload = data?.puzzles ?? null;
  if (!puzzlesPayload)
    throw new Error('puzzles/get returned empty payload');

  await pool.query(
    `UPDATE chesscup.duel_games SET puzzles = $1 WHERE id = $2`,
    [puzzlesPayload, opts.gameId]
  );

  return {
    puzzlesCount: Array.isArray(puzzlesPayload?.puzzles)
      ? puzzlesPayload.puzzles.length
      : null,
  };
}

// рядом с остальными ключами
const gameUserSocketsKey = (gameId: string, userId: string) =>
  `game:${gameId}:user:${userId}:sockets`; // SET socketId

async function setGamePresenceOn(
  gameId: string,
  userId: string,
  socketId: string
) {
  await pub.sadd(gameUserSocketsKey(gameId, userId), socketId);
}

async function setGamePresenceOff(
  gameId: string,
  userId: string,
  socketId: string
) {
  const k = gameUserSocketsKey(gameId, userId);
  await pub.srem(k, socketId);
  const left = await pub.scard(k);
  if (left === 0) await pub.del(k);
  return left; // сколько ещё сокетов у пользователя в этой игре
}

async function isPlayerOnlineInGame(gameId: string, userId: string) {
  return (await pub.scard(gameUserSocketsKey(gameId, userId))) > 0;
}

io.on('connection', (socket) => {
  const { userId, name } = getAuth(socket);
  socket.data.userId = userId;
  socket.data.name = name;
  socket.data.isGuest = !socket.handshake.auth?.userId;
  socket.data.watching = new Set<string>();

  // Храним в сокете список лобби, куда он вступил
  socket.data.lobbies = new Set<string>();

  socket.join(`user:${userId}`);

  socket.on(
    'mm:list',
    async ({ lobbyId }: { lobbyId: string }, cb?: Function) => {
      if (!lobbyId) return cb?.({ list: [] });
      const list = await getOpenSearches(lobbyId);
      cb?.({ list });
    }
  );

  socket.on(
    'lobby:join',
    async ({ lobbyId }: { lobbyId: string }) => {
      if (!lobbyId) return;
      const room = `lobby:${lobbyId}`;
      socket.join(room);
      socket.data.lobbies.add(lobbyId);

      const multi = pub.multi();
      multi.sadd(lobbyMembersKey(lobbyId), userId!);
      multi.sadd(lobbyUserSocketsKey(lobbyId, userId!), socket.id);
      multi.hset(
        lobbyUsersInfoKey(lobbyId),
        userId!,
        JSON.stringify({ userId, name })
      );
      multi.expire(lobbyUserSocketsKey(lobbyId, userId!), 60 * 60);
      await multi.exec();

      io.to(room).emit('presence:join', { userId, name });
      await emitPresenceSnapshot(lobbyId, room);
      // отдать присоединившемуся стартовый список поиска игр
      const mmList = await getOpenSearches(lobbyId);
      socket.emit('mm:snapshot', { lobbyId, list: mmList });
    }
  );

  socket.on(
    'lobby:leave',
    async ({ lobbyId }: { lobbyId: string }) => {
      if (!lobbyId) return;
      const room = `lobby:${lobbyId}`;
      socket.leave(room);
      socket.data.lobbies.delete(lobbyId);
      await removeSocketFromLobby(lobbyId, userId!, socket.id, room);
      await emitPresenceSnapshot(lobbyId, room);
    }
  );

  // ВАЖНО: использовать 'disconnecting', а не 'disconnect'
  socket.on('disconnecting', async () => {
    const uid = String(socket.data.userId || '');
    if (!uid) return;

    // 1) отменяем поиск в лобби (если есть), но БЕЗ return
    const lobbies: string[] = Array.from(socket.data.lobbies ?? []);
    if (lobbies.length) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const lobbyId of lobbies) {
          const upd = await client.query(
            `UPDATE chesscup.duel_searches
              SET status = 'cancelled'
            WHERE lobby_id = $1 AND user_id = $2 AND status = 'open'
            RETURNING id`,
            [lobbyId, uid]
          );
          if (upd.rowCount > 0) {
            io.to(`lobby:${lobbyId}`).emit('mm:close', {
              lobbyId,
              userId: uid,
            });
          }
        }
        await client.query('COMMIT');
      } catch {
        await client.query('ROLLBACK').catch(() => {});
      } finally {
        client.release();
      }
    }

    // 2) ВСЕГДА чистим присутствие в играх
    const watching: string[] = Array.from(socket.data.watching ?? []);
    await Promise.all(
      watching.map(async (gameId) => {
        const left = await setGamePresenceOff(gameId, uid, socket.id);
        const room = `game:${gameId}`;
        if (left === 0) {
          io.to(room).emit('game:user:online', {
            gameId,
            userId: uid,
            online: false,
          });
        }
        // минусуем текущий сокет из счётчика наблюдателей
        const sockets = await io.in(room).fetchSockets();
        io.to(room).emit('watchers:snapshot', {
          gameId,
          count: Math.max(0, sockets.length - 1),
        });
      })
    );
  });

  socket.on(
    'queue:start',
    async (
      p: { lobbyId: string; tcSeconds: number; incSeconds: number },
      cb?: Function
    ) => {
      if (
        !p?.lobbyId ||
        !Number.isFinite(p.tcSeconds) ||
        !Number.isFinite(p.incSeconds)
      ) {
        return cb?.({ error: 'bad_request' });
      }
      // запрет гостям
      if (socket.data?.isGuest) {
        return cb?.({
          error: 'GUEST_FORBIDDEN',
          message: 'Гостям нельзя играть',
        });
      }

      const userId = String(socket.data.userId);
      const username = String(socket.data.name || userId);
      const rating = Number(socket.data.rating || 1500); // если есть в данных авторизации — можно пробросить
      const { lobbyId, tcSeconds, incSeconds } = p;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // если уже есть открытая заявка — не дублируем
        const check = await client.query(
          `SELECT id FROM chesscup.duel_searches WHERE user_id = $1 AND lobby_id = $2 AND status = 'open'`,
          [userId, lobbyId]
        );
        if (check.rowCount > 0) {
          await client.query('COMMIT');
          const search = check.rows[0];
          cb?.({ ok: true, searchId: search.id });
          return;
        }

        const ins = await client.query(
          `INSERT INTO chesscup.duel_searches (lobby_id, user_id, username, rating, tc_seconds, inc_seconds)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, user_id, username, rating, tc_seconds, inc_seconds, created_at`,
          [lobbyId, userId, username, rating, tcSeconds, incSeconds]
        );
        await client.query('COMMIT');

        const row = ins.rows[0];
        cb?.({ ok: true, searchId: row.id, search: row });

        // сообщаем всем в лобби
        const room = `lobby:${lobbyId}`;
        io.to(room).emit('mm:open', { lobbyId, search: row });
      } catch (e) {
        await pool.query('ROLLBACK').catch(() => {});
        cb?.({ error: 'server_error' });
      } finally {
        client.release();
      }
    }
  );

  // отмена поиска
  socket.on(
    'queue:cancel',
    async (p: { lobbyId: string }, cb?: Function) => {
      if (!p?.lobbyId) return cb?.({ error: 'bad_request' });
      const lobbyId =
        p?.lobbyId ?? Array.from(socket.data.lobbies ?? [])[0];
      if (!lobbyId) return cb?.({ error: 'not_in_lobby' });
      const userId = String(socket.data.userId);

      const upd = await pool.query(
        `UPDATE chesscup.duel_searches
          SET status = 'cancelled'
        WHERE lobby_id = $1 AND user_id = $2 AND status = 'open'
        RETURNING id`,
        [lobbyId, userId]
      );

      if (upd.rowCount > 0) {
        io.to(`lobby:${lobbyId}`).emit('mm:close', {
          lobbyId,
          userId,
        });
        cb?.({ ok: true });
      } else {
        cb?.({ ok: true, already: true });
      }
    }
  );

  // принять чужую заявку (создать игру)
  socket.on(
    'queue:accept',
    async (p: { searchId: number }, cb?: Function) => {
      const searchId = Number(p?.searchId);
      if (!Number.isFinite(searchId)) {
        console.warn('queue:accept bad payload', p);
        return cb?.({ error: 'bad_request' });
      }
      if (socket.data?.isGuest)
        return cb?.({ error: 'GUEST_FORBIDDEN' });

      const acceptorId = String(socket.data.userId);
      const acceptorName = String(socket.data.name || acceptorId);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const lock = await client.query(
          `UPDATE chesscup.duel_searches
         SET status = 'matched'
       WHERE id = $1 AND status = 'open'
       RETURNING id, lobby_id, user_id, username, rating, tc_seconds, inc_seconds`,
          [searchId]
        );
        if (lock.rowCount === 0) {
          await client.query('ROLLBACK');
          return cb?.({ error: 'already_matched_or_cancelled' });
        }

        const s = lock.rows[0];
        if (s.user_id === acceptorId) {
          await client.query('ROLLBACK');
          return cb?.({ error: 'self_match_forbidden' });
        }

        // создаём игру
        let shortId = makeShortId();
        // на всякий — гарантируем уникальность short_id
        for (let i = 0; i < 3; i++) {
          const c = await client.query(
            `SELECT 1 FROM chesscup.duel_games WHERE short_id = $1`,
            [shortId]
          );
          if (c.rowCount === 0) break;
          shortId = makeShortId();
        }

        const gameIns = await client.query(
          `INSERT INTO chesscup.duel_games (short_id, lobby_id, tc_seconds, inc_seconds, started_at)
         VALUES ($1,$2,$3,$4, now())
         RETURNING id, short_id`,
          [shortId, s.lobby_id, s.tc_seconds, s.inc_seconds]
        );
        const game = gameIns.rows[0];

        // белые — инициатор заявки, чёрные — принявший (можно рандомить)
        await client.query(
          `INSERT INTO chesscup.duel_game_players (game_id, user_id, username, color, rating_pre)
         VALUES ($1,$2,$3,'w',$4), ($1,$5,$6,'b',$7)`,
          [
            game.id,
            s.user_id,
            s.username,
            s.rating,
            acceptorId,
            acceptorName,
            socket.data.rating ?? 1500,
          ]
        );

        // привяжем в заявке game_id
        await client.query(
          `UPDATE chesscup.duel_searches SET matched_game_id = $1 WHERE id = $2`,
          [game.id, s.id]
        );

        await client.query('COMMIT');

        // всем в лобби — закрываем эту заявку
        io.to(`lobby:${s.lobby_id}`).emit('mm:close', {
          lobbyId: s.lobby_id,
          userId: s.user_id,
        });

        try {
          const result = await fetchAndSaveGamePuzzles({
            gameId: game.id,
            tcSeconds: s.tc_seconds,
            incSeconds: s.inc_seconds,
            rating: s.rating ?? null,
            // theme: <если добавите в duel_searches>,
          });
          console.log(
            `[duel] puzzles saved for game ${game.id}, count=${
              result.puzzlesCount ?? 'n/a'
            }`
          );
          // отдадим пазлы обоим игрокам сразу
          const { rows } = await pool.query(
            `SELECT puzzles FROM chesscup.duel_games WHERE id = $1`,
            [game.id]
          );
          const puzzlesPayload = rows[0]?.puzzles;
          if (puzzlesPayload) {
            io.to(`user:${s.user_id}`).emit('game:puzzles', {
              gameId: game.id,
              puzzles: puzzlesPayload,
            });
            io.to(`user:${acceptorId}`).emit('game:puzzles', {
              gameId: game.id,
              puzzles: puzzlesPayload,
            });
          }
        } catch {
          console.error(
            '[duel] failed to fetch/save puzzles for game',
            game.id
          );
          // не блокируем создание игры — UI может сам запросить /puzzles/get при заходе в игру
        }

        // стало: шлём в персональные комнаты
        io.to(`user:${s.user_id}`).emit('game:created', {
          gameId: game.id,
          shortId: game.short_id,
          color: 'w',
        });
        io.to(`user:${acceptorId}`).emit('game:created', {
          gameId: game.id,
          shortId: game.short_id,
          color: 'b',
        });

        cb?.({ ok: true, gameId: game.id, shortId: game.short_id });
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        cb?.({ error: 'server_error' });
      } finally {
        client.release();
      }
    }
  );
  // join по shortId: вернём снапшот, присоединимся к комнате
  socket.on(
    'game:join',
    async ({ shortId }: { shortId: string }, cb?: Function) => {
      try {
        if (!shortId) return cb?.({ error: 'bad_request' });
        const game = await getGameByShortId(shortId);
        if (!game) return cb?.({ error: 'not_found' });

        const room = `game:${game.id}`;
        socket.join(room);
        socket.data.watching.add(game.id);

        // роль сокета относительно этой партии
        const players = await getGamePlayers(game.id);
        const me = String(socket.data.userId || '');
        const role: 'white' | 'black' | 'spectator' =
          players.find((p) => p.user_id === me)?.color === 'w'
            ? 'white'
            : players.find((p) => p.user_id === me)?.color === 'b'
            ? 'black'
            : 'spectator';

        // если пазлов ещё нет — подтянем и сохраним (не блокируем ошибкой)
        if (!game.puzzles) {
          try {
            await fetchAndSaveGamePuzzles({
              gameId: game.id,
              tcSeconds: game.tc_seconds,
              incSeconds: game.inc_seconds,
              rating: null,
              theme: null,
            });
            // перечитаем puzzles
            const again = await getGameByShortId(shortId);
            if (again?.puzzles) game.puzzles = again.puzzles;
          } catch {
            console.error(
              '[duel] game:join puzzles fetch failed for',
              game.id
            );
          }
        }

        // watchers count (по желанию)
        const watchers = await io.in(room).fetchSockets();
        const watchersCount = watchers.length;

        await setGamePresenceOn(
          game.id,
          String(socket.data.userId),
          socket.id
        );

        // вычислим онлайн игроков для снапшота
        const playersOnline: Record<string, boolean> = {};
        for (const p of players) {
          playersOnline[p.user_id] = await isPlayerOnlineInGame(
            game.id,
            p.user_id
          );
        }

        // прогресс в снапшоте (карты userId -> value)
        const scores: Record<string, number> = {};
        const effortsMap: Record<string, any[]> = {};
        for (const p of players) {
          scores[p.user_id] = p.points ?? 0;
          effortsMap[p.user_id] = Array.isArray(p.efforts)
            ? p.efforts
            : [];
        }

        cb?.({
          ok: true,
          snapshot: {
            game: {
              id: game.id,
              short_id: game.short_id,
              lobby_id: game.lobby_id,
              status: game.status,
              tc_seconds: game.tc_seconds,
              inc_seconds: game.inc_seconds,
            },
            players,
            role,
            puzzles: game.puzzles ?? null,
            watchersCount,
            playersOnline,
            scores, // 👈
            efforts: effortsMap, // 👈
          },
        });

        io.to(room).emit('watchers:snapshot', {
          gameId: game.id,
          count: watchersCount,
        });
        io.to(room).emit('game:user:online', {
          gameId: game.id,
          userId: String(socket.data.userId),
          online: true,
        });

        // ДОПОЛНИТЕЛЬНО: отдать пазлы только этому сокету (повторный вход/обновление)
        if (game.puzzles) {
          io.to(socket.id).emit('game:puzzles', {
            gameId: game.id,
            puzzles: game.puzzles,
          });
        } else {
          // если пазлы подтянули только что — мы их выше сохранили, перечитали в again
          // и здесь тоже шлём
          const again = await getGameByShortId(shortId);
          if (again?.puzzles) {
            io.to(socket.id).emit('game:puzzles', {
              gameId: game.id,
              puzzles: again.puzzles,
            });
          }
        }
      } catch {
        console.error('game:join error');
        cb?.({ error: 'server_error' });
      }
    }
  );

  socket.on(
    'game:solve',
    async (
      p: {
        shortId: string;
        fen?: string;
        moves?: string;
        correct: boolean;
        puzzleId?: string;
      },
      cb?: Function
    ) => {
      try {
        const me = String(socket.data.userId || '');
        if (!me) return cb?.({ error: 'unauthorized' });

        const game = await getGameByShortId(p.shortId);
        if (!game) return cb?.({ error: 'not_found' });

        // проверяем, что игрок в этой партии
        const { rows: rowsCheck } = await pool.query(
          `SELECT 1 FROM chesscup.duel_game_players WHERE game_id = $1 AND user_id = $2`,
          [game.id, me]
        );
        if (rowsCheck.length === 0)
          return cb?.({ error: 'forbidden' });

        const effort = [
          {
            id: p.puzzleId ?? (p.fen || String(Date.now())),
            result: !!p.correct,
          },
        ];

        // +1 очко за правильный
        const delta = p.correct ? 1 : 0;

        const upd = await pool.query(
          `UPDATE chesscup.duel_game_players
            SET points  = points + $1,
                efforts = COALESCE(efforts, '[]'::jsonb) || $2::jsonb
          WHERE game_id = $3 AND user_id = $4
          RETURNING points, efforts`,
          [delta, JSON.stringify(effort), game.id, me]
        );
        const myPoints = upd.rows[0]?.points ?? 0;
        const myEfforts = upd.rows[0]?.efforts ?? [];

        // рассылаем в комнату только дельту моего прогресса
        io.to(`game:${game.id}`).emit('game:state', {
          gameId: game.id,
          scores: { [me]: myPoints },
          efforts: { [me]: myEfforts },
        });

        cb?.({ ok: true, scoreMine: myPoints });
      } catch (e) {
        console.error('game:solve error', e);
        cb?.({ error: 'server_error' });
      }
    }
  );

  // lеave (по желанию, можно вызывать при размонтировании)
  socket.on(
    'game:leave',
    async ({ shortId }: { shortId: string }) => {
      const game = await getGameByShortId(shortId);
      if (!game) return;
      const room = `game:${game.id}`;
      socket.leave(room);
      socket.data.watching.delete(game.id);
      const watchers = await io.in(room).fetchSockets();
      io.to(room).emit('watchers:snapshot', {
        gameId: game.id,
        count: watchers.length,
      });
      const left = await setGamePresenceOff(
        game.id,
        String(socket.data.userId),
        socket.id
      );
      if (left === 0) {
        io.to(room).emit('game:user:online', {
          gameId: game.id,
          userId: String(socket.data.userId),
          online: false,
        });
      }
    }
  );
});

// async function removeSocketFromLobby(
//   lobbyId: string,
//   userId: string,
//   socketId: string,
//   room: string
// ) {
//   const userSocketsKey = lobbyUserSocketsKey(lobbyId, userId);
//   await pub.srem(userSocketsKey, socketId);
//   const remaining = await pub.scard(userSocketsKey);
//   if (remaining === 0) {
//     const multi = pub.multi();
//     multi.del(userSocketsKey);
//     multi.srem(lobbyMembersKey(lobbyId), userId);
//     multi.hdel(lobbyUsersInfoKey(lobbyId), userId);
//     await multi.exec();
//     io.to(room).emit('presence:leave', { userId });
//   }
// }

async function emitPresenceSnapshot(lobbyId: string, room: string) {
  const list = await getLobbyOnlineList(lobbyId);
  io.to(room).emit('presence:snapshot', { list, count: list.length });
}
type UserLite = { userId: string; name: string };

async function getLobbyOnlineList(
  lobbyId: string
): Promise<UserLite[]> {
  const ids = await pub.smembers(lobbyMembersKey(lobbyId));
  if (ids.length === 0) return [];
  const pipe = pub.pipeline();
  ids.forEach((id) => pipe.hget(lobbyUsersInfoKey(lobbyId), id));
  const res = await pipe.exec(); // [ [null, jsonOrNull], ... ]

  const users: UserLite[] = [];
  res.forEach(([, json], i) => {
    if (json) {
      try {
        users.push(JSON.parse(json));
      } catch {
        users.push({ userId: ids[i], name: ids[i] });
      }
    } else {
      users.push({ userId: ids[i], name: ids[i] });
    }
  });
  return users;
}

// Удаляем сокет; если это был последний сокет пользователя в лобби — снимаем online и шлём leave
async function removeSocketFromLobby(
  lobbyId: string,
  userId: string,
  socketId: string,
  room: string
) {
  const userSocketsKey = lobbyUserSocketsKey(lobbyId, userId);
  await pub.srem(userSocketsKey, socketId);
  const remaining = await pub.scard(userSocketsKey);
  if (remaining === 0) {
    const multi = pub.multi();
    multi.del(userSocketsKey);
    multi.srem(lobbyMembersKey(lobbyId), userId);
    multi.hdel(lobbyUsersInfoKey(lobbyId), userId); // <--- добавлено
    await multi.exec();
    io.to(room).emit('presence:leave', { userId });
  }
}

app.get('/healthz', (_req, res) => res.send('ok'));

(async () => {
  await waitRedisReady(pub);
  await withStartupLock(pub, async () => {
    await purgePresenceNamespace(pub, 'lobby:*');
    await purgePresenceNamespace(pub, 'game:*'); // <— чтобы убрать зависшие game:<id>:user:<uid>:sockets
  });

  server.listen(PORT, () => {
    console.log(`presence server on :${PORT}`);
  });
})();

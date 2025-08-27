import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';
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

io.on('connection', (socket) => {
  const { userId, name } = getAuth(socket);
  socket.data.userId = userId;
  socket.data.name = name;

  // Храним в сокете список лобби, куда он вступил
  socket.data.lobbies = new Set<string>();

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
    const userId = String(socket.data.userId || '');
    if (!userId) return;
    const lobbies: string[] = Array.from(socket.data.lobbies ?? []);
    if (!lobbies.length) return;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const lobbyId of lobbies) {
        const upd = await client.query(
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
        }
      }
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK').catch(() => {});
    } finally {
      client.release();
    }
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
      const lobbyId = p.lobbyId;
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
      if (!Number.isFinite(p?.searchId))
        return cb?.({ error: 'bad_request' });
      if (socket.data?.isGuest)
        return cb?.({ error: 'GUEST_FORBIDDEN' });

      const acceptorId = String(socket.data.userId);
      const acceptorName = String(socket.data.name || acceptorId);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // жёстко лочим выбранную заявку, чтобы не было двойного принятия
        const lock = await client.query(
          `UPDATE chesscup.duel_searches
            SET status = 'matched'
          WHERE id = $1 AND status = 'open'
          RETURNING id, lobby_id, user_id, username, rating, tc_seconds, inc_seconds`,
          [p.searchId]
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

        // обоим игрокам — событие «игра создана»
        const roomW = [...io.of('/').sockets.values()]
          .filter((sock) => sock.data?.userId === s.user_id)
          .map((sock) => sock.id);
        const roomB = [socket.id];

        io.to(roomW).emit('game:created', {
          gameId: game.id,
          shortId: game.short_id,
          color: 'w',
        });
        io.to(roomB).emit('game:created', {
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
  // одноразовая очистка всего presence-неймспейса при старте
  await withStartupLock(pub, () =>
    purgePresenceNamespace(pub, 'lobby:*')
  );

  server.listen(PORT, () => {
    console.log(`presence server on :${PORT}`);
  });
})();

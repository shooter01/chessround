// src/Duel/DuelGameModule.tsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { Container, Grid, Box, Typography } from '@mui/material';
import { io, Socket } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Board from '../Board/Board';
import ResultBattleUser, { BattleUserProps } from './components/BattleUser/ResultBattleUser';
import CurrentPuzzle from '../Rush/current/current';
// + NEW:
import PuzzleFaceitCard, { PuzzleFaceitInfo } from './components/PuzzleFaceitCard';

declare global {
  interface Window {
    puzzlesCounter: number;
    currentPuzzlesMoves: string[];
    currentPuzzle: any;
    chess: any;
    cg: any;
    setPosition: () => void;
    playComputerMove: () => void;

    setCorrect?: (isCorrect: boolean) => Promise<void>;
    setNextPuzzle?: () => void;
    addCorrectPuzzle?: (current: any, result: boolean) => Promise<void> | void;
  }
}

// безопасные заглушки — чтобы userMoves.ts не падал до монтирования
if (typeof window !== 'undefined') {
  window.setCorrect ??= async () => {};
  window.setNextPuzzle ??= () => {};
  window.addCorrectPuzzle ??= async () => {};
  window.puzzlesCounter ??= -1;
  window.currentPuzzlesMoves ??= [];
}

type Effort = { id: string; result: boolean };
const CENTER_W = 48;
const WS_URL = import.meta.env.VITE_PRESENCE_WS_URL || 'http://localhost:8088';

type PlayerRow = { user_id: string; username: string; color: 'w' | 'b'; rating_pre: number | null };

type Snapshot = {
  game: {
    id: string;
    short_id: string;
    lobby_id: string;
    status: string;
    tc_seconds: number;
    inc_seconds: number;
  };
  players: PlayerRow[];
  role: 'white' | 'black' | 'spectator';
  puzzles: any | null;
  watchersCount: number;
  playersOnline?: Record<string, boolean>;
  scores?: Record<string, number>;
  currentIndex?: Record<string, number>;
  efforts?: Record<string, Effort[]>;
};

type PlayerOnlineMap = Record<string, boolean>;

function toBattleUserProps(p?: PlayerRow, isOnline?: boolean): BattleUserProps {
  return {
    userclass: p?.color === 'w' ? 'white' : 'black',
    user_id: p?.user_id ?? 'unknown',
    user_name: p?.username ?? 'Unknown',
    errors_array: [],
    player_online: isOnline ?? true,
    rating: p?.rating_pre ?? 0,
    country: undefined,
    countries: {},
    image: '',
    points: 0,
    efforts_array: [],
  };
}

const DuelGameModule: React.FC = () => {
  const pickTheme = (p: any) => {
    // lichess puzzles обычно: themes: "fork doubleCheck" | массив
    if (!p) return null;
    const t = Array.isArray(p.themes)
      ? p.themes[0]
      : typeof p.themes === 'string'
        ? p.themes.split(' ')[0]
        : null;
    return t || null;
  };
  const refreshFaceitInfo = (idx: number) => {
    const list = puzzlesListRef.current;
    if (!list || !list[idx]) return;

    const p = list[idx];
    const id = String(p.puzzle_id ?? p.id ?? idx);
    const rating = typeof p.rating === 'number' ? p.rating : null;

    // активный цвет из FEN (первый ход — компьютер; пользователь играет ПРОТИВОПОЛОЖНЫМ цветом)
    let userSide: 'W' | 'B' = 'W';
    try {
      const parts = String(p.fen).split(' ');
      const active = parts[1] === 'w' ? 'W' : 'B';
      userSide = active === 'W' ? 'B' : 'W';
    } catch {}

    // длина решения: берём половину списка ходов (сколько делает пользователь)
    const movesCount = typeof p.moves === 'string' ? p.moves.trim().split(/\s+/).length : 0;
    const mv = Math.floor(movesCount / 2);

    const theme = pickTheme(p);
    const popularity = typeof p.popularity === 'number' ? p.popularity : null;

    const myEff = effortsMap[myUserId] ?? [];
    const last: ('W' | 'L')[] = myEff.slice(-5).map((e) => (e.result ? 'W' : 'L'));

    setFaceitInfo({ id, rating, mv, side: userSide, theme, popularity, last });
  };
  const { shortId } = useParams();
  const { user } = useAuth();
  const myUserId = user?.id ?? '';
  const [faceitInfo, setFaceitInfo] = useState<PuzzleFaceitInfo | null>(null);

  const socketRef = useRef<Socket | null>(null);

  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [onlineMap, setOnlineMap] = useState<PlayerOnlineMap>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [effortsMap, setEffortsMap] = useState<Record<string, Effort[]>>({});
  const [currentIndex, setCurrentIndex] = useState<Record<string, number>>({});

  // список пазлов для матча
  const puzzlesListRef = useRef<any[] | null>(null);
  // какой индекс уже инициализирован (чтобы не дублировать setPosition/playComputerMove)
  const initedIdxRef = useRef<number | null>(null);

  // API, которое подсовываем в window.*
  const apiRef = useRef<{
    setCorrect: (ok: boolean) => Promise<void>;
    setNextPuzzle: () => void;
    addCorrectPuzzle: (current: any, result: boolean) => Promise<void> | void;
  }>({
    setCorrect: async () => {},
    setNextPuzzle: () => {},
    addCorrectPuzzle: async () => {},
  });

  // прокинем window.* на реальные реализации
  useLayoutEffect(() => {
    window.setCorrect = async (isCorrect: boolean) => apiRef.current.setCorrect(isCorrect);
    // ⚠️ в дуэли локально НЕ шагаем вперёд — только по серверу
    window.setNextPuzzle = () => apiRef.current.setNextPuzzle();
    window.addCorrectPuzzle = (current: any, result: boolean) =>
      apiRef.current.addCorrectPuzzle(current, result);
  }, []);

  useLayoutEffect(() => {
    window.emitPly = (uci: string, fen: string) => apiRef.current.emitPly(uci, fen);
  }, []);

  useEffect(() => {
    apiRef.current.emitPly = (uci: string, fen: string) => {
      const idx = typeof window.puzzlesCounter === 'number' ? window.puzzlesCounter : 0;
      const userId = myUserId || '';
      socketRef.current?.emit('game:ply', { shortId, userId, idx, uci, fen });
    };
  }, [myUserId, shortId]);

  useEffect(() => {
    // прокидываем глобальный хук, чтобы userMoves.ts мог дернуть
    (window as any).onDuelPly = (ev: { uci: string; fen: string; idx: number }) => {
      if (!shortId) return;
      socketRef.current?.emit('game:ply', {
        shortId,
        idx: Number(ev.idx),
        uci: String(ev.uci),
        fen: String(ev.fen),
      });
    };
    return () => {
      (window as any).onDuelPly = undefined;
    };
  }, [shortId]);

  // вытаскиваем массив пазлов из payload (как в rush)
  const extractList = (payload: any): any[] | null => {
    if (!payload) return null;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.puzzles)) return payload.puzzles;
    if (Array.isArray(payload?.puzzles?.puzzles)) return payload.puzzles.puzzles;
    return null;
  };

  // ставим доску на конкретный индекс
  const setBoardToIndex = (idx: number) => {
    if (idx == null || idx < 0) return;
    if (initedIdxRef.current === idx) return;

    const list = puzzlesListRef.current;
    if (!list || !list[idx]) return;

    initedIdxRef.current = idx;

    window.cg?.setAutoShapes?.([]);
    window.currentPuzzlesMoves = [];
    window.puzzlesCounter = idx;

    const p = list[idx];

    window.currentPuzzle = new CurrentPuzzle(idx, p);
    window.currentPuzzle.startFen = p.fen;

    try {
      window.chess?.load?.(p.fen);
    } catch {}

    try {
      const pov = (window.currentPuzzle?.pov ?? 'white') as 'white' | 'black';
      window.cg?.set?.({ orientation: pov });
      window.setPosition?.();
    } catch {}

    // + NEW: обновляем карточку
    refreshFaceitInfo(idx);

    setTimeout(() => {
      try {
        window.playComputerMove?.();
      } catch {}
    }, 250);
  };

  useEffect(() => {
    if (faceitInfo && puzzlesListRef.current) {
      const idx = initedIdxRef.current ?? 0;
      const myEff = effortsMap[myUserId] ?? [];
      const last = myEff.slice(-5).map((e) => (e.result ? 'W' : 'L')) as ('W' | 'L')[];
      setFaceitInfo({ ...faceitInfo, last });
    }
  }, [effortsMap[myUserId]]); // eslint-disable-line react-hooks/exhaustive-deps

  // первичная инициализация пазлов + прогресса
  const bootstrapWithProgress = (puzzlesPayload: any, s?: Snapshot) => {
    if (!puzzlesListRef.current) {
      const list = extractList(puzzlesPayload);
      if (list && list.length) puzzlesListRef.current = list;
    }
    if (!puzzlesListRef.current?.length) return;

    const myIdx =
      s?.currentIndex && typeof s.currentIndex[myUserId] === 'number'
        ? s.currentIndex[myUserId]!
        : 0;

    setBoardToIndex(myIdx);

    if (s?.scores) setScores((prev) => ({ ...prev, ...s.scores }));
    if (s?.efforts) setEffortsMap((prev) => ({ ...prev, ...s.efforts }));
    if (s?.currentIndex) setCurrentIndex((prev) => ({ ...prev, ...s.currentIndex }));
  };

  // Реализации API для window.* (теперь без локального инкремента)
  useEffect(() => {
    apiRef.current.addCorrectPuzzle = async (current, result) => {
      try {
        const pid =
          current?.puzzle?.puzzle_id ?? current?.puzzle?.id ?? String(window.puzzlesCounter);
        const me = myUserId || 'me';
        setEffortsMap((prev) => {
          const mine = Array.isArray(prev[me]) ? prev[me]!.slice() : [];
          mine.push({ id: String(pid), result });
          return { ...prev, [me]: mine };
        });
      } catch {
        // ignore
      }
    };

    // ❌ Локально вперёд не двигаемся — ждём server ACK/stream
    apiRef.current.setNextPuzzle = () => {
      /* no-op in duel mode */
    };

    apiRef.current.setCorrect = async (isCorrect: boolean) => {
      // оптимистично покажем очко
      if (isCorrect) {
        setScores((prev) => ({ ...prev, [myUserId]: (prev[myUserId] ?? 0) + 1 }));
      }
      try {
        const fen: string =
          window.currentPuzzle?.puzzle?.fen ??
          (typeof window.chess?.fen === 'function' ? window.chess.fen() : '');
        const moves: string = Array.isArray(window.currentPuzzlesMoves)
          ? window.currentPuzzlesMoves.join(' ')
          : '';

        socketRef.current?.emit(
          'game:solve',
          { shortId, fen, moves, correct: !!isCorrect },
          (res?: { ok?: boolean; scoreMine?: number; nextIdx?: number }) => {
            if (res?.ok) {
              if (typeof res.scoreMine === 'number') {
                setScores((prev) => ({ ...prev, [myUserId]: res.scoreMine! }));
              }
              // если сервер сразу прислал следующий индекс — ставим доску на него
              if (typeof res.nextIdx === 'number' && puzzlesListRef.current) {
                if (initedIdxRef.current !== res.nextIdx) {
                  setBoardToIndex(res.nextIdx);
                }
              }
            }
          },
        );
      } catch {
        // ignore
      }
    };
  }, [myUserId, shortId]);

  // socket
  useEffect(() => {
    const s = io(WS_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: { userId: user?.id, name: user?.username ?? user?.id },
    });
    socketRef.current = s;

    s.on('connect', () => {
      s.emit(
        'game:join',
        { shortId },
        (res?: { ok?: boolean; snapshot?: Snapshot; error?: string }) => {
          if (res?.ok && res.snapshot) {
            setSnap(res.snapshot);
            setOnlineMap(res.snapshot.playersOnline || {});
            bootstrapWithProgress(res.snapshot.puzzles, res.snapshot);
          } else {
            console.warn('game:join failed', res);
          }
        },
      );
    });

    // пазлы могут приехать отдельно при обновлении страницы
    s.on('game:puzzles', ({ puzzles }: { gameId: string; puzzles: any }) => {
      if (!puzzlesListRef.current?.length) {
        bootstrapWithProgress(puzzles, snap || undefined);
      }
    });

    s.on(
      'game:user:online',
      ({ userId, online }: { gameId: string; userId: string; online: boolean }) => {
        setOnlineMap((prev) => ({ ...prev, [userId]: online }));
      },
    );

    s.on(
      'game:state',
      (st: {
        gameId: string;
        scores?: Record<string, number>;
        currentIndex?: Record<string, number>;
        efforts?: Record<string, Effort[]>;
      }) => {
        if (st.scores) setScores((prev) => ({ ...prev, ...st.scores }));
        if (st.efforts) setEffortsMap((prev) => ({ ...prev, ...st.efforts }));
        if (st.currentIndex) {
          setCurrentIndex((prev) => ({ ...prev, ...st.currentIndex }));
          const nextIdx = st.currentIndex[myUserId];
          if (
            typeof nextIdx === 'number' &&
            puzzlesListRef.current &&
            nextIdx !== initedIdxRef.current
          ) {
            setBoardToIndex(nextIdx);
          }
        }
      },
    );

    return () => {
      try {
        s.emit('game:leave', { shortId });
      } finally {
        s.off('game:puzzles');
        s.off('game:user:online');
        s.off('game:state');
        s.disconnect();
      }
    };
  }, [shortId, user?.id, user?.username]); // snap намеренно не включаем

  // UI
  const white = useMemo(() => snap?.players.find((p) => p.color === 'w'), [snap]);
  const black = useMemo(() => snap?.players.find((p) => p.color === 'b'), [snap]);

  const leftId = white?.user_id ?? '';
  const rightId = black?.user_id ?? '';

  const leftProps: BattleUserProps = {
    ...toBattleUserProps(white, onlineMap[leftId]),
    points: scores[leftId] ?? 0,
    efforts_array: effortsMap[leftId] ?? [],
  };

  const rightProps: BattleUserProps = {
    ...toBattleUserProps(black, onlineMap[rightId]),
    points: scores[rightId] ?? 0,
    efforts_array: effortsMap[rightId] ?? [],
  };

  const centerText = useMemo(() => {
    if (!snap?.game) return '…';
    const m = Math.floor(snap.game.tc_seconds / 60);
    return `${m}+${snap.game.inc_seconds}`;
  }, [snap?.game]);

  return (
    <Container maxWidth="lg">
      <Grid
        container
        spacing={2}
        sx={{ width: '100%', maxWidth: 1400, justifyContent: 'center', mx: 'auto' }}
      >
        {/* Левая зона: доска */}
        <Grid
          item
          xs={12}
          md={8}
          sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}
        >
          <Board />
        </Grid>

        {/* Правая панель: две карточки игроков */}
        <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ width: '100%' }}>
            {/* верхний ряд — 2 карточки игроков + центр с контролем */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'stretch',
                gap: 1.5,
                flexWrap: 'nowrap',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
                <ResultBattleUser {...leftProps} dense />
              </Box>

              <Box
                sx={{
                  flex: `0 0 ${CENTER_W}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 0,
                }}
              >
                <Typography variant="caption" fontWeight={700} noWrap>
                  {centerText}
                </Typography>
              </Box>

              <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
                <ResultBattleUser {...rightProps} dense />
              </Box>
            </Box>

            {/* НИЖЕ: карточка текущего пазла в стиле Faceit */}
            {faceitInfo && (
              <Box sx={{ mt: 1.25 }}>
                <PuzzleFaceitCard {...faceitInfo} />
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DuelGameModule;

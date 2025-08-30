// src/Duel/DuelGameModule.tsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { Container, Grid, Box, Typography } from '@mui/material';
import { io, Socket } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Board from '../Board/Board';
import ResultBattleUser, { BattleUserProps } from './components/BattleUser/ResultBattleUser';
import CurrentPuzzle from '../Rush/current/current';

// ------- ГЛОБАЛЬНЫЕ БЕЗОПАСНЫЕ ЗАГЛУШКИ (чтобы userMoves.ts не падал до маунта) -------
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
if (typeof window !== 'undefined') {
  if (typeof window.setCorrect !== 'function') window.setCorrect = async () => {};
  if (typeof window.setNextPuzzle !== 'function') window.setNextPuzzle = () => {};
  if (typeof window.addCorrectPuzzle !== 'function') window.addCorrectPuzzle = async () => {};
}

// ---------------------------------------------------------------------------------------

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
    rating: p?.rating_pre ?? 1500,
    country: undefined,
    countries: {},
    image: '',
    points: 0,
    efforts_array: [],
  };
}

const DuelGameModule: React.FC = () => {
  const { shortId } = useParams();
  const { user } = useAuth();
  const myUserId = user?.id ?? '';

  const socketRef = useRef<Socket | null>(null);

  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [onlineMap, setOnlineMap] = useState<PlayerOnlineMap>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [effortsMap, setEffortsMap] = useState<Record<string, Effort[]>>({});
  const [currentIndex, setCurrentIndex] = useState<Record<string, number>>({});

  const puzzlesListRef = useRef<any[] | null>(null);

  // ---------- стабильные ссылки на реализацию API, к которым проксируются window.* ----------
  const apiRef = useRef<{
    setCorrect: (ok: boolean) => Promise<void>;
    setNextPuzzle: () => void;
    addCorrectPuzzle: (current: any, result: boolean) => Promise<void> | void;
  }>({
    setCorrect: async () => {},
    setNextPuzzle: () => {},
    addCorrectPuzzle: async () => {},
  });

  // Привязываем window.* к прокси-обёрткам ОДИН РАЗ — они всегда вызовут актуальные функции из apiRef
  useLayoutEffect(() => {
    window.setCorrect = async (isCorrect: boolean) => apiRef.current.setCorrect(isCorrect);
    window.setNextPuzzle = () => apiRef.current.setNextPuzzle();
    window.addCorrectPuzzle = (current: any, result: boolean) =>
      apiRef.current.addCorrectPuzzle(current, result);
  }, []);

  const extractList = (payload: any): any[] | null => {
    if (!payload) return null;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.puzzles)) return payload.puzzles;
    if (Array.isArray(payload?.puzzles?.puzzles)) return payload.puzzles.puzzles;
    return null;
  };

  const setBoardToIndex = (idx: number) => {
    const list = puzzlesListRef.current;
    if (!list || !list[idx]) return;

    window.cg?.setAutoShapes?.([]);
    window.currentPuzzlesMoves = [];
    window.puzzlesCounter = idx;

    const p = list[idx];
    window.currentPuzzle = new CurrentPuzzle(idx, p);
    window.currentPuzzle.startFen = p.fen;

    window.chess?.load?.(p.fen);
    if (typeof window.setPosition === 'function') window.setPosition();

    setTimeout(() => {
      if (typeof window.playComputerMove === 'function') window.playComputerMove();
    }, 300);
  };

  const bootstrapWithProgress = (puzzlesPayload: any, s?: Snapshot) => {
    const list = extractList(puzzlesPayload);
    if (!list || !list.length) return;
    puzzlesListRef.current = list;

    const myIdx =
      s?.currentIndex && typeof s.currentIndex[myUserId] === 'number'
        ? s.currentIndex[myUserId]!
        : 0;

    if (window.puzzlesCounter !== myIdx) setBoardToIndex(myIdx);

    if (s?.scores) setScores((prev) => ({ ...prev, ...s.scores }));
    if (s?.efforts) setEffortsMap((prev) => ({ ...prev, ...s.efforts }));
    if (s?.currentIndex) setCurrentIndex((prev) => ({ ...prev, ...s.currentIndex }));
  };

  // ---------- Реальные реализации API кладём в apiRef после маунта ----------
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
        // no-op
      }
    };

    apiRef.current.setNextPuzzle = () => {
      const list = puzzlesListRef.current;
      if (!list) return;
      const next = (window.puzzlesCounter ?? -1) + 1;
      if (next >= list.length) return;
      setBoardToIndex(next);
    };

    apiRef.current.setCorrect = async (isCorrect: boolean) => {
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
              if (typeof res.nextIdx === 'number' && puzzlesListRef.current) {
                if (window.puzzlesCounter !== res.nextIdx) setBoardToIndex(res.nextIdx);
              }
            }
          },
        );
      } catch {
        // ignore
      }
    };
  }, [myUserId, shortId]);

  // ---------- socket ----------
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

    s.on('game:puzzles', ({ puzzles }: { gameId: string; puzzles: any }) => {
      bootstrapWithProgress(puzzles, snap || undefined);
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
          if (typeof nextIdx === 'number' && puzzlesListRef.current) {
            if (window.puzzlesCounter !== nextIdx) setBoardToIndex(nextIdx);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortId, user?.id, user?.username]);

  // ---------- UI ----------
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
            <Box
              sx={{
                display: 'flex',
                alignItems: 'stretch',
                gap: 1.5,
                flexWrap: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {/* Белые */}
              <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
                <ResultBattleUser {...leftProps} dense />
              </Box>

              {/* Центр: тайм-контроль */}
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

              {/* Чёрные */}
              <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
                <ResultBattleUser {...rightProps} dense />
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DuelGameModule;

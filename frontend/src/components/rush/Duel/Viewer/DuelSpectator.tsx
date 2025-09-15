import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { Box, Container, Grid, Typography, Paper, Stack, Chip } from '@mui/material';
import SpectatorBoard, { SpectatorBoardHandle } from './SpectatorBoard';

type Effort = { id: string; result: boolean };
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

const WS_URL = import.meta.env.VITE_PRESENCE_WS_URL || 'http://localhost:8088';

function extractList(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.puzzles)) return payload.puzzles;
  if (Array.isArray(payload?.puzzles?.puzzles)) return payload.puzzles.puzzles;
  return [];
}

// POV решающего как в Rush: если в объекте пазла есть pov — используем;
// иначе смотрим FEN: side-to-move => первый ход компьютера, значит POV игрока — противоположный
function povFromPuzzle(p: any): 'white' | 'black' {
  if (p && typeof p.pov === 'string') return p.pov === 'black' ? 'black' : 'white';
  try {
    const stm = String(p?.fen || '').split(' ')[1] === 'b' ? 'black' : 'white';
    return stm === 'white' ? 'black' : 'white';
  } catch {
    return 'white';
  }
}

const DuelSpectator: React.FC = () => {
  const { shortId } = useParams();
  const socketRef = useRef<Socket | null>(null);

  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState<Record<string, number>>({});
  const [puzzles, setPuzzles] = useState<any[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);

  // две независимые доски
  const boardW = useRef<SpectatorBoardHandle>(null);
  const boardB = useRef<SpectatorBoardHandle>(null);

  const byColor = useMemo(() => {
    const w = players.find((p) => p.color === 'w');
    const b = players.find((p) => p.color === 'b');
    return { w, b };
  }, [players]);

  // выставить старт конкретному игроку (по его текущему индексу)
  const setPuzzleFor = (color: 'w' | 'b', idx: number) => {
    const p = puzzles[idx];
    if (!p) return;
    const fen = p.fen;
    const pov = povFromPuzzle(p);
    const ref = color === 'w' ? boardW.current : boardB.current;
    ref?.setPuzzle(fen, pov);
  };

  const applyPlyFor = (color: 'w' | 'b', payload: { uci?: string; fen?: string }) => {
    const ref = color === 'w' ? boardW.current : boardB.current;
    if (!ref) return;
    if (payload.fen) ref.applyFen(payload.fen);
    else if (payload.uci) ref.applyUci(payload.uci);
  };

  // первичный коннект
  useEffect(() => {
    const s = io(WS_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = s;

    s.on('connect', () => {
      s.emit('game:join', { shortId }, (res?: { ok?: boolean; snapshot?: Snapshot }) => {
        if (res?.ok && res.snapshot) {
          const snapshot = res.snapshot;
          setSnap(snapshot);
          setPlayers(snapshot.players || []);
          if (snapshot.scores) setScores(snapshot.scores);
          if (snapshot.currentIndex) setCurrentIndex(snapshot.currentIndex);
          const list = extractList(snapshot.puzzles);
          if (list.length) setPuzzles(list);
        }
      });
    });

    s.on('game:puzzles', ({ puzzles: payload }: { gameId: string; puzzles: any }) => {
      const list = extractList(payload);
      if (list.length) setPuzzles((prev) => (prev.length ? prev : list));
    });

    // очки/индексы
    s.on(
      'game:state',
      (st: {
        gameId: string;
        scores?: Record<string, number>;
        currentIndex?: Record<string, number>;
      }) => {
        if (st.scores) setScores((prev) => ({ ...prev, ...st.scores }));
        if (st.currentIndex) {
          // если индекс поменялся — сразу переставим стартовую позицию на доске
          const wId = byColor.w?.user_id ?? '';
          const bId = byColor.b?.user_id ?? '';
          setCurrentIndex((prev) => {
            const next = { ...prev, ...st.currentIndex };
            if (wId && typeof st.currentIndex[wId] === 'number') {
              setPuzzleFor('w', st.currentIndex[wId]!);
            }
            if (bId && typeof st.currentIndex[bId] === 'number') {
              setPuzzleFor('b', st.currentIndex[bId]!);
            }
            return next;
          });
        }
      },
    );

    // полуходы (и компьютерные, и пользовательские)
    s.on('game:ply', (p: { userId: string; idx: number; uci?: string; fen?: string }) => {
      const color =
        p.userId === byColor.w?.user_id ? 'w' : p.userId === byColor.b?.user_id ? 'b' : null;
      if (!color) return;

      // если пришёл ход по другому индексу — переинициализируем пазл
      const currIdx = currentIndex[p.userId] ?? 0;
      if (currIdx !== p.idx && puzzles[p.idx]) {
        setPuzzleFor(color, p.idx);
        setCurrentIndex((prev) => ({ ...prev, [p.userId]: p.idx }));
      }

      // применяем ходы/позицию
      applyPlyFor(color, { uci: p.uci, fen: p.fen });
    });

    return () => {
      try {
        s.emit('game:leave', { shortId });
      } finally {
        s.off('game:puzzles');
        s.off('game:state');
        s.off('game:ply');
        s.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortId, byColor.w?.user_id, byColor.b?.user_id]);

  // когда у нас и игроки, и пазлы — выставим стартовые позиции
  useEffect(() => {
    if (!puzzles.length || !players.length) return;
    const wId = byColor.w?.user_id ?? '';
    const bId = byColor.b?.user_id ?? '';
    if (wId) setPuzzleFor('w', currentIndex[wId] ?? 0);
    if (bId) setPuzzleFor('b', currentIndex[bId] ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzles, players]);

  const w = byColor.w;
  const b = byColor.b;

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      {/* ВЕРХНЯЯ ПАНЕЛЬ */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
        >
          <Box>
            <Typography variant="overline" color="text.secondary">
              {`${Math.floor((snap?.game.tc_seconds ?? 0) / 60)}+${snap?.game.inc_seconds ?? 0}`}
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              Chesscup Duel — Spectator
            </Typography>
          </Box>

          <Stack direction="row" spacing={4}>
            <Box textAlign="center" minWidth={120}>
              <Typography variant="caption" color="text.secondary">
                {w ? `${w.username} (${w.rating_pre ?? '—'})` : 'White'}
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {scores[w?.user_id ?? ''] ?? 0}
              </Typography>
            </Box>
            <Box textAlign="center" minWidth={120}>
              <Typography variant="caption" color="text.secondary">
                {b ? `${b.username} (${b.rating_pre ?? '—'})` : 'Black'}
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {scores[b?.user_id ?? ''] ?? 0}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      {/* НИЖЕ — ДВЕ ДОСКИ В РЯД (адаптивно: xs=12 -> в столбик, md=6 -> в ряд) */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Typography variant="subtitle2">{w ? w.username : 'White'}</Typography>
              <Chip size="small" label={`Points: ${scores[w?.user_id ?? ''] ?? 0}`} />
            </Stack>
            <SpectatorBoard minSize={360} ref={boardW} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Typography variant="subtitle2">{b ? b.username : 'Black'}</Typography>
              <Chip size="small" label={`Points: ${scores[b?.user_id ?? ''] ?? 0}`} />
            </Stack>
            <SpectatorBoard minSize={360} ref={boardB} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DuelSpectator;

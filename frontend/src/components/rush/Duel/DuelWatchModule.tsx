// src/Duel/DuelWatchModule.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Box, Chip, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import { io, Socket } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import SpectatorBoard from './Viewer/SpectatorBoard';
import '../Board/assets/chessground.css';
const WS_URL = import.meta.env.VITE_PRESENCE_WS_URL || 'http://localhost:8088';

type Player = { user_id: string; username: string; color: 'w' | 'b'; rating_pre: number | null };
type LiveState = { idx: number; fen: string; seq?: string[]; updatedAt?: number } | null;
type Effort = { id: string; result: boolean };

type Snapshot = {
  game: { id: string; short_id: string; tc_seconds: number; inc_seconds: number };
  players: Player[];
  puzzles: any | null;
  scores?: Record<string, number>;
  currentIndex?: Record<string, number>;
  efforts?: Record<string, Effort[]>;
  live?: Record<string, LiveState>;
};

function extractPuzzles(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.puzzles)) return payload.puzzles;
  if (Array.isArray(payload?.puzzles?.puzzles)) return payload.puzzles.puzzles;
  return [];
}

type BoardAPI = { setPosition: (fen: string, lastUci?: string) => void };

const DuelWatchModule: React.FC = () => {
  const { shortId } = useParams();
  const socketRef = useRef<Socket | null>(null);

  // refs на две независимые доски зрителя
  const leftRef = useRef<BoardAPI>(null);
  const rightRef = useRef<BoardAPI>(null);

  // база
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState<Record<string, number>>({});
  const [puzzlesList, setPuzzlesList] = useState<any[]>([]);
  const [tc, setTc] = useState<{ m: number; inc: number }>({ m: 3, inc: 0 });

  const white = players.find((p) => p.color === 'w');
  const black = players.find((p) => p.color === 'b');

  // Инициализация позиции игрока:
  // 1) если есть live.fen -> ставим его;
  // 2) иначе, если есть puzzles и currentIndex -> ставим puzzles[idx].fen;
  const initPlayerBoard = (player: Player, live: LiveState | null) => {
    const ref = player.color === 'w' ? leftRef.current : rightRef.current;
    if (!ref) return;

    if (live?.fen) {
      ref.setPosition(live.fen);
      return;
    }
    if (puzzlesList.length) {
      const idx =
        typeof currentIndex[player.user_id] === 'number' ? currentIndex[player.user_id] : 0;
      const p = puzzlesList[idx];
      if (p?.fen) ref.setPosition(p.fen);
    }
  };

  // Первичный коннект и снапшот
  useEffect(() => {
    const s = io(WS_URL, { transports: ['websocket', 'polling'], withCredentials: true });
    socketRef.current = s;

    s.on('connect', () => {
      s.emit('game:join', { shortId }, (res?: { ok?: boolean; snapshot?: Snapshot }) => {
        if (!res?.ok || !res.snapshot) return;
        const snap = res.snapshot;

        setPlayers(snap.players || []);
        setScores(snap.scores || {});
        setCurrentIndex(snap.currentIndex || {});
        setPuzzlesList(extractPuzzles(snap.puzzles));
        setTc({
          m: Math.floor((snap.game?.tc_seconds ?? 180) / 60),
          inc: snap.game?.inc_seconds ?? 0,
        });

        // ВАЖНО: не ждём реактовских мемо — используем игроков прямо из снапшота
        const w = snap.players.find((p) => p.color === 'w');
        const b = snap.players.find((p) => p.color === 'b');

        // Инициализируем позиции сразу (live.fen приоритетнее)
        if (w) initPlayerBoard(w, snap.live?.[w.user_id] ?? null);
        if (b) initPlayerBoard(b, snap.live?.[b.user_id] ?? null);
      });
    });

    // Текущие очки/индексы
    s.on(
      'game:state',
      (st: { scores?: Record<string, number>; currentIndex?: Record<string, number> }) => {
        if (st.scores) setScores((prev) => ({ ...prev, ...st.scores }));
        if (st.currentIndex) setCurrentIndex((prev) => ({ ...prev, ...st.currentIndex }));
        // позицию по state НЕ меняем — позицию двигают ply-события/ live.fen
      },
    );

    // Онлайн полуходы — НИЧЕГО не «докручиваем», просто ставим присланный fen и подсвечиваем ход
    s.on(
      'game:ply',
      (e: { gameId: string; userId: string; idx: number; uci: string; fen: string }) => {
        const isWhite = white && e.userId === white.user_id;
        const isBlack = black && e.userId === black.user_id;
        const lastUci = e.uci;
        if (isWhite) leftRef.current?.setPosition(e.fen, lastUci);
        else if (isBlack) rightRef.current?.setPosition(e.fen, lastUci);
      },
    );

    return () => {
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortId]); // намеренно не включаем white/black — они пересоздадут подписки

  // DuelGameModule.tsx
  useEffect(() => {
    window.onDuelPly = ({ uci, fen, idx }) => {
      socketRef.current?.emit('game:ply', { shortId, uci, fen, idx });
    };
    return () => {
      // @ts-ignore
      window.onDuelPly = undefined;
    };
  }, [shortId]);

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" fontWeight={800}>
              Viewer • #{shortId}
            </Typography>
            <Chip size="small" variant="outlined" label={`${tc.m}+${tc.inc}`} />
          </Stack>
        </Grid>

        <Grid item xs={12} md={6}>
          <SpectatorBoard
            ref={leftRef}
            orientation="white"
            title={white ? `${white.username} (${white.rating_pre ?? '—'})` : 'White'}
            score={white ? (scores[white.user_id] ?? 0) : 0}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <SpectatorBoard
            ref={rightRef}
            orientation="white" // хотите — поставьте "black"
            title={black ? `${black.username} (${black.rating_pre ?? '—'})` : 'Black'}
            score={black ? (scores[black.user_id] ?? 0) : 0}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default DuelWatchModule;

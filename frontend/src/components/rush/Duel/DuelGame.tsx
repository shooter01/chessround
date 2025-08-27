// src/Duel/DuelGameModule.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Container, Grid, Box, Typography } from '@mui/material';
import { io, Socket } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Board from '../Board/Board';
import ResultBattleUser, { BattleUserProps } from './components/BattleUser/ResultBattleUser';

const CENTER_W = 48;
const WS_URL = import.meta.env.VITE_PRESENCE_WS_URL || 'http://localhost:8088';
type PlayerOnlineMap = Record<string, boolean>;

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
};

function toBattleUserProps(p?: PlayerRow, isOnline?: boolean): BattleUserProps {
  return {
    userclass: p?.color === 'w' ? 'white' : 'black',
    user_id: p?.user_id ?? 'unknown',
    user_name: p?.username ?? 'Unknown',
    errors_array: [],
    player_online: !!isOnline,
    rating: p?.rating_pre ?? 1500,
    country: undefined,
    countries: {},
    image: '',
    points: 0,
    efforts_array: [],
  };
}

// const leftProps = toBattleUserProps(white, onlineMap[white?.user_id ?? '']);
// const rightProps = toBattleUserProps(black, onlineMap[black?.user_id ?? '']);

const DuelGameModule: React.FC = () => {
  const { shortId } = useParams();
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [onlineMap, setOnlineMap] = useState<PlayerOnlineMap>({});

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
          } else {
            console.warn('game:join failed', res);
          }
        },
      );
    });

    s.on(
      'game:user:online',
      ({ userId, online }: { gameId: string; userId: string; online: boolean }) => {
        setOnlineMap((prev) => ({ ...prev, [userId]: online }));
      },
    );

    return () => {
      try {
        s.emit('game:leave', { shortId });
      } finally {
        s.off('game:user:online');
        s.disconnect();
      }
    };
  }, [shortId, user?.id, user?.username]);

  const white = useMemo(() => snap?.players.find((p) => p.color === 'w'), [snap]);
  const black = useMemo(() => snap?.players.find((p) => p.color === 'b'), [snap]);

  const leftProps = toBattleUserProps(white, onlineMap[white?.user_id ?? '']);
  const rightProps = toBattleUserProps(black, onlineMap[black?.user_id ?? '']);

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

        {/* Правая панель: две карточки игроков как в DuelComponent */}
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

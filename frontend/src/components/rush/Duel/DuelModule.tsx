import React, { useEffect, useRef, useState } from 'react';
import { Container, Grid, Box } from '@mui/material';
import Board from '../Board/Board';
import DuelLobby from './DuelLobby';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

// тип из DuelLobby
type Friend = {
  id: string;
  name: string;
  rating: number;
  online: boolean;
  avatarUrl?: string;
  flagUrl?: string;
};

type UserLite = { userId: string; name: string };

const DuelModule: React.FC = () => {
  const socketRef = useRef<Socket | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const { user, token } = useAuth(); // предполагается, что здесь есть ваш JWT
  console.log(user, token);
  const isGuest = !user;

  useEffect(() => {
    const url = import.meta.env.VITE_PRESENCE_WS_URL || 'http://localhost:8088';
    const s = io(url, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: { userId: user?.id, name: user?.username ?? user?.id },
    });
    socketRef.current = s;

    const toFriend = (u: UserLite) => ({
      id: u.userId,
      name: u.name,
      rating: 1500,
      online: true,
    });

    s.on('connect', () => {
      s.emit('lobby:join', { lobbyId: 'main' });

      // первичный снимок
      s.emit('presence:list', null, (list: UserLite[]) => {
        setFriends(list.map(toFriend));
        console.log('online now:', list);
      });
    });

    // инкрементально обновляем список
    s.on('presence:snapshot', (p: { list: UserLite[]; count: number }) => {
      setFriends(p.list.map(toFriend));
    });

    s.on('presence:join', (u: UserLite) => {
      setFriends((prev) => (prev.some((x) => x.id === u.userId) ? prev : [...prev, toFriend(u)]));
    });

    s.on('presence:leave', (u: { userId: string }) => {
      setFriends((prev) => prev.filter((x) => x.id !== u.userId));
    });

    s.on('connect_error', (err) => {
      console.error('socket connect_error:', err.message, err);
    });

    return () => {
      try {
        s.emit('lobby:leave', { lobbyId: 'main' });
      } finally {
        s.disconnect();
      }
    };
  }, []);

  return (
    <Container maxWidth="lg">
      <Grid
        container
        spacing={2}
        sx={{ width: '100%', maxWidth: 1400, justifyContent: 'center', mx: 'auto' }}
      >
        <Grid
          item
          xs={12}
          md={8}
          sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}
        >
          <Board />
        </Grid>

        <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ width: '100%' }}>
            <DuelLobby
              rating={user?.perfs?.blitz?.rating ?? 1600}
              isGuest={isGuest}
              monthPoints={null}
              friends={online.map((u) => ({
                id: u.userId,
                name: u.name,
                rating: 1500,
                online: true,
                // если хочешь показать индикатор «Ищет игру»
                searching: searches.some((s) => s.user_id === u.userId),
              }))}
              loading={false}
              onPlay={() => (mySearchId ? cancelPlay() : handlePlay())}
              onAcceptSearch={acceptSearch} // добавь такой проп в DuelLobby (кнопка «Принять» рядом с тем, кто ищет)
              mySearching={!!mySearchId} // чтобы кнопка Play менялась на «Отменить»
              searches={searches} // можно отрисовать отдельным списком «Ищут игру»
            />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DuelModule;

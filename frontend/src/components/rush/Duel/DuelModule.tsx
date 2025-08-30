import React, { useEffect, useRef, useState } from 'react';
import { Container, Grid, Box } from '@mui/material';
import Board from '../Board/Board';
import DuelLobby from './DuelLobby';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
type Search = {
  id: number;
  user_id: string;
  username: string;
  rating: number;
  tc_seconds: number;
  inc_seconds: number;
  created_at: string;
};
const DuelModule: React.FC = () => {
  const socketRef = useRef<Socket | null>(null);
  const [mySearchId, setMySearchId] = useState<number | null>(null);
  const [online, setOnline] = useState<UserLite[]>([]);
  const [searches, setSearches] = useState<Search[]>([]);

  const [friends, setFriends] = useState<Friend[]>([]);
  const { user, token } = useAuth(); // предполагается, что здесь есть ваш JWT
  console.log(user, token);
  const isGuest = !user;
  const navigate = useNavigate();

  useEffect(() => {
    const url = import.meta.env.VITE_PRESENCE_WS_URL || 'http://localhost:8088';
    const s = io(url, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: { userId: user?.id, name: user?.username ?? user?.id },
    });
    socketRef.current = s;

    s.on('connect', () => {
      s.emit('lobby:join', { lobbyId: 'main' });

      // первичный снимок
      s.emit('presence:list', null, (list: UserLite[]) => setOnline(list));
      s.emit('mm:list', { lobbyId: 'main' }, (snapshot?: { list: Search[] }) => {
        if (snapshot?.list) setSearches(snapshot.list);
      });
    });

    // инкрементально обновляем список
    s.on('presence:snapshot', (p: { list: UserLite[]; count: number }) => setOnline(p.list));

    s.on('presence:join', (u: UserLite) =>
      setOnline((prev) => (prev.some((x) => x.userId === u.userId) ? prev : [...prev, u])),
    );

    s.on('presence:leave', (u: { userId: string }) =>
      setOnline((prev) => prev.filter((x) => x.userId !== u.userId)),
    );

    s.on('connect_error', (err) => {
      console.error('socket connect_error:', err.message, err);
    });

    s.on('mm:snapshot', ({ list }: { list: Search[] }) => {
      setSearches(list);
    });
    s.on('mm:open', ({ search }: { search: Search }) => {
      setSearches((prev) => (prev.some((x) => x.id === search.id) ? prev : [...prev, search]));
    });
    s.on('mm:close', ({ userId, searchId }: { userId: string; searchId?: number }) => {
      setSearches((prev) =>
        searchId != null
          ? prev.filter((x) => x.id !== searchId)
          : prev.filter((x) => x.user_id !== userId),
      );
      if (user?.id && userId === user.id) setMySearchId(null);
    });

    s.on('game:created', ({ shortId }: { shortId: string }) => {
      setMySearchId(null);
      navigate(`/duel/${shortId}`);
    });

    return () => {
      try {
        s.emit('lobby:leave', { lobbyId: 'main' });
        s.off('mm:snapshot');
        s.off('mm:open');
        s.off('mm:close');
        s.off('game:created');

        if (mySearchId) s.emit('queue:cancel', { lobbyId: 'main' });
      } finally {
        s.disconnect();
      }
    };
  }, [user?.id, user?.username, navigate]);

  const handlePlay = () => {
    if (isGuest) {
      // покажи модалку логина
      return;
    }
    socketRef.current?.emit(
      'queue:start',
      { lobbyId: 'main', tcSeconds: 180, incSeconds: 2 },
      (res: any) => {
        if (res?.ok) setMySearchId(res.searchId);
        else console.warn('queue:start failed', res);
      },
    );
  };

  // принять чужую заявку
  const acceptSearch = (searchId: number) => {
    if (isGuest) return;
    socketRef.current?.emit('queue:accept', { searchId }, (res: any) => {
      if (res?.error) console.warn('accept failed', res);
      // успех обработается в 'game:created'
    });
  };

  // отмена поиска (если нужно)
  const cancelPlay = () => {
    // 1) мгновенно чистим у себя
    if (user?.id) {
      setSearches((prev) => prev.filter((s) => s.user_id !== user.id));
    }
    setMySearchId(null);

    // 2) шлём на сервер; ACK только логируем
    socketRef.current?.emit('queue:cancel', { lobbyId: 'main' }, (res: any) => {
      if (res?.error) {
        console.warn('queue:cancel failed', res);
        // при желании можно откатить локальные изменения:
        // refetch mm:list или вернуть mySearchId
      }
    });
  };

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
              // rating={user?.perfs?.blitz?.rating ?? 1600}
              isGuest={isGuest}
              monthPoints={null}
              friends={online.map((u) => ({
                id: u.userId,
                name: u.name,
                // rating: 1500,
                online: true,
                // если хочешь показать индикатор «Ищет игру»
                searching: searches.some((s) => s.user_id === u.userId),
              }))}
              selfId={user?.id} // ← чтобы подсвечивать "You"
              loading={false}
              onPlay={() => handlePlay()} // ← только старт
              onCancelSearch={cancelPlay} // ← вот это главное!              onAcceptSearch={acceptSearch} // добавь такой проп в DuelLobby (кнопка «Принять» рядом с тем, кто ищет)
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

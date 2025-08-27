import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

export type UserLite = { userId: string; name: string };

export function usePresence(socket: Socket | null) {
  const [list, setList] = useState<UserLite[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    const onJoin = (u: UserLite) => {
      setList((prev) => (prev.find((x) => x.userId === u.userId) ? prev : [...prev, u]));
      setCount((c) => c + 1);
    };
    const onLeave = (u: { userId: string }) => {
      setList((prev) => prev.filter((x) => x.userId !== u.userId));
      setCount((c) => Math.max(0, c - 1));
    };
    const onSnapshot = (p: { list: UserLite[]; count: number }) => {
      setList(p.list);
      setCount(p.count);
    };

    socket.on('presence:join', onJoin);
    socket.on('presence:leave', onLeave);
    socket.on('presence:snapshot', onSnapshot);

    socket.emit('presence:list', null, (serverList: UserLite[]) => {
      setList(serverList);
      setCount(serverList.length);
    });

    return () => {
      socket.off('presence:join', onJoin);
      socket.off('presence:leave', onLeave);
      socket.off('presence:snapshot', onSnapshot);
    };
  }, [socket]);

  return { list, count };
}

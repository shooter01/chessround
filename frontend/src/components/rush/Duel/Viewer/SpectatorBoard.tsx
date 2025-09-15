import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import '../../Board/assets/chessground.css';

export type SpectatorBoardHandle = {
  setPuzzle: (fen: string, pov: 'white' | 'black') => void;
  applyFen: (fen: string) => void;
  applyUci: (uci: string) => void;
  getFen: () => string;
};

type Props = {
  minSize?: number; // минимальная высота (px), по умолчанию 360
};

const SpectatorBoard = forwardRef<SpectatorBoardHandle, Props>(({ minSize = 360 }, ref) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cgRef = useRef<any>(null);
  const chessRef = useRef<any>(new Chess());
  const readyRef = useRef(false);

  // helper: перерисовать CG при ресайзе контейнера/окна
  const redraw = () => {
    try {
      cgRef.current?.redrawAll?.();
    } catch {}
  };

  useEffect(() => {
    if (!wrapRef.current) return;
    const cg = Chessground(wrapRef.current, {
      draggable: { enabled: false },
      animation: { enabled: true, duration: 180 },
      highlight: { lastMove: true, check: true },
      premovable: { enabled: false },
      movable: { enabled: false },
      coordinates: false,
      viewOnly: true,
    });
    cgRef.current = cg;
    readyRef.current = true;

    const onResize = () => redraw();
    window.addEventListener('resize', onResize);

    return () => {
      try {
        cg?.destroy?.();
      } catch {}
      window.removeEventListener('resize', onResize);
      readyRef.current = false;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    setPuzzle: (fen, pov) => {
      if (!readyRef.current) return;
      try {
        chessRef.current.load(fen);
      } catch {}
      cgRef.current.set({
        fen: chessRef.current.fen(),
        lastMove: undefined,
        orientation: pov,
        turnColor: chessRef.current.turn() === 'w' ? 'white' : 'black',
        check: chessRef.current.inCheck?.() ?? false,
      });
      redraw();
    },
    applyFen: (fen) => {
      if (!readyRef.current) return;
      try {
        chessRef.current.load(fen);
      } catch {}
      cgRef.current.set({
        fen: chessRef.current.fen(),
        lastMove: undefined,
        turnColor: chessRef.current.turn() === 'w' ? 'white' : 'black',
        check: chessRef.current.inCheck?.() ?? false,
      });
      redraw();
    },
    applyUci: (uci) => {
      if (!readyRef.current) return;
      try {
        const move = chessRef.current.move(uci);
        cgRef.current.set({
          fen: chessRef.current.fen(),
          lastMove: move ? [move.from, move.to] : undefined,
          turnColor: chessRef.current.turn() === 'w' ? 'white' : 'black',
          check: chessRef.current.inCheck?.() ?? false,
        });
      } catch {}
      redraw();
    },
    getFen: () => {
      try {
        return chessRef.current.fen();
      } catch {
        return '';
      }
    },
  }));

  return (
    <div
      ref={wrapRef}
      style={{
        width: '100%',
        aspectRatio: '1 / 1', // квадратная «резиновая» доска
        minHeight: minSize,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--mui-palette-divider)',
        background: 'var(--mui-palette-background-paper)',
      }}
    />
  );
});

export default SpectatorBoard;

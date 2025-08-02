// Board.tsx
import * as React from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { PromotionCtrl, WithGround } from '../chessground/promotionCtrl';
import {
  initChessground,
  setInitialGround,
  makeRedraw,
  ensurePromotionRoot,
  makePlayUserMove,
  makeUserMoveHandler,
  withGround,
  getGround,
  applyResize,
} from './utils/helpers';
import { configureSiteSound } from './utils/sound_init';
import './assets/chessground.css';
import './assets/promotion.css';
import './assets/pieces.css';
import './assets/board.css';
import './assets/theme.css';
import './assets/3d.css';
import './assets/examples.css';
import { log } from '../chessground/units/lib/permalog';

configureSiteSound();

// Простая генерация всех шахматных клеток
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const SQUARES: string[] = FILES.flatMap((f) => RANKS.map((r) => `${f}${r}`));
type Key = string;

export function toDests(chess: Chess): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>();
  SQUARES.forEach((s) => {
    // verbose чтобы получить { to: '...' }
    // @ts-ignore: chess.js types may vary
    const ms = chess.moves({ square: s, verbose: true }) as any[];
    if (ms && ms.length) {
      dests.set(
        s,
        ms.map((m) => m.to),
      );
    }
  });
  return dests;
}

const Board: React.FC = () => {
  const dirtyRef = useRef<HTMLDivElement | null>(null);
  const promotionRootRef = useRef<HTMLElement | null>(null);
  const promotionVnodeRef = useRef<any>(null);
  const chessRef = useRef<Chess>(new Chess());

  // expose для отладки
  (window as any).chess = chessRef.current;

  // playUserMove (вспомогательный)
  const playUserMove = useCallback((orig: string, dest: string, promotion?: string) => {
    const handler = makePlayUserMove(chessRef.current);
    handler(orig, dest, promotion);
  }, []);

  // userMove с промоушеном
  const userMove = useCallback(
    (orig: string, dest: string, meta?: any) => {
      const promotionCtrl = (window as any).promotion as PromotionCtrl;
      if (!promotionCtrl) return;
      log && log(orig, dest, meta);
      const isPromoting = promotionCtrl.start(
        orig,
        dest,
        {
          submit: (o: string, d: string, role: string) => {
            playUserMove(o, d, role);
          },
          show: (_ctrl: any, _roles: any) => {
            // можно подсветить варианты
          },
        },
        meta,
      );
      if (!isPromoting) {
        playUserMove(orig, dest);
      }
    },
    [playUserMove],
  );

  useEffect(() => {
    const dirty = dirtyRef.current;
    if (!dirty) {
      console.error('dirtyRef missing');
      return;
    }

    // инициализация chessground с заглушкой; потом заменим move handler
    const cg = initChessground(dirty, () => {});
    setInitialGround();

    // подготовка promotion
    const redraw = makeRedraw(promotionRootRef, promotionVnodeRef);
    ensurePromotionRoot(dirty, promotionRootRef, promotionVnodeRef, redraw);

    // withGround и setGround
    const withGroundFn: WithGround = (f: any) => {
      const g = getGround();
      return g ? f(g) : undefined;
    };
    const setGround = () =>
      withGroundFn((g: any) => g.set(/* при необходимости передай контекст */));

    // создаём контроллер промоушена
    (window as any).promotion = new PromotionCtrl(withGroundFn, () => setInitialGround(), redraw);

    // реальный handler хода
    const realPlayUserMove = makePlayUserMove(chessRef.current);
    const realUserMove = makeUserMoveHandler(
      (window as any).promotion as PromotionCtrl,
      realPlayUserMove,
    );

    if (cg) {
      cg.set({
        events: {
          move: realUserMove,
        },
      });
    }

    // initial redraw promotion
    redraw();

    // resize
    applyResize(dirty, {}, 0, () => true);

    // делаем userMove / realUserMove доступным глобально, чтобы window.setPosition мог его использовать
    (window as any).userMove = realUserMove;

    // определяем setPosition с использованием same userMove
    window.setPosition = (lastMove: any) => {
      const chess = (window as any).chess as Chess;
      const cgInstance = (window as any).cg;
      if (!cgInstance || !chess) return;
      const puzzle = (window as any).currentPuzzle || {};
      const pov = puzzle.pov || 'white';
      cgInstance.set({
        fen: chess.fen(),
        lastMove: lastMove ? lastMove : null,
        check: chess.isCheck(),
        animation: {
          duration: 100,
        },
        orientation: pov,
        highlight: {
          check: true,
        },
        turnColor: chess.turn() === 'w' ? 'white' : 'black',
        premovable: {
          enabled: true,
        },
        movable: {
          showDests: true,
          free: false,
          color: pov,
          dests: toDests(chess),
        },
        events: {
          move: realUserMove,
        },
      });
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="blue cburnett is2d" style={{ position: 'relative' }}>
      <div id="dirty" ref={(r) => (dirtyRef.current = r)} className="cg-board-wrap" />
      {/* Промоушен встраивается автоматически */}
    </div>
  );
};

export default Board;

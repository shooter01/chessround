// Board.tsx
import * as React from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { PromotionCtrl } from './promotionCtrl';
import { Chessground } from 'chessground';
import { Chess, SQUARES } from 'chess.js';

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
import { userMove } from './userMoves';
import { setZoom } from './setZoom';
import { toDests } from './toDests';
import { toColor } from './toColor';
import './assets/chessground.css';
import './assets/promotion.css';
import './assets/pieces.css';
import './assets/board.css';
import './assets/theme.css';
import './assets/3d.css';
import './assets/examples.css';
import { log } from '../chessground/units/lib/permalog';
const initialZoom = parseFloat(localStorage.getItem('lichess-dev.cge.zoom') || '170');

// const fen = '8/8/8/8/8/3k4/6p1/3K4 b - - 0 1';
const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const orientation = 'white';

configureSiteSound();

// Простая генерация всех шахматных клеток
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];
type Key = string;
window.chess = new Chess(fen);

export function resizeHandle(els, pref, ply, visible?): void {
  // if (pref === ShowResizeHandle.Never) return;

  const el = document.createElement('cg-resize');
  els.container.appendChild(el);

  const startResize = (start) => {
    start.preventDefault();

    const mousemoveEvent = start.type === 'touchstart' ? 'touchmove' : 'mousemove',
      mouseupEvent = start.type === 'touchstart' ? 'touchend' : 'mouseup',
      startPos = eventPosition(start)!;
    let zoom = initialZoom;

    // const saveZoom = debounce(() => xhr.text(`/pref/zoom?v=${zoom}`, { method: 'post' }), 700);

    const resize = (move) => {
      const pos = eventPosition(move)!,
        delta = pos[0] - startPos[0] + pos[1] - startPos[1];

      zoom = Math.round(Math.max(50, Math.max(0, initialZoom + delta / 10)));

      document.body.style.setProperty('---zoom', zoom.toString());
      window.dispatchEvent(new Event('resize'));
      setZoom(zoom);
      // saveZoom();
    };

    document.body.classList.add('resizing');

    document.addEventListener(mousemoveEvent, resize);

    document.addEventListener(
      mouseupEvent,
      () => {
        document.removeEventListener(mousemoveEvent, resize);
        document.body.classList.remove('resizing');
      },
      { once: true },
    );
  };

  el.addEventListener('touchstart', startResize, { passive: false });
  el.addEventListener('mousedown', startResize, { passive: false });

  // if (pref === ShowResizeHandle.OnlyAtStart) {
  // const toggle = (ply: number) => el.classList.toggle('none', visible ? !visible(ply) : ply >= 2);
  // toggle(ply);
  // pubsub.on('ply', toggle);
  // }
}

function eventPosition(e): [number, number] | undefined {
  if (e.clientX || e.clientX === 0) return [e.clientX, e.clientY!];
  if (e.targetTouches?.[0]) return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
  return;
}

window.playComputerMove = (): void => {
  setTimeout(() => {
    try {
      // ожидаемый ход компьютера в формате UCI (например "e7e5", "a2a1q")
      const compUci: string = window.currentPuzzle.expectedMove();

      // применяем ход в движке (у тебя уже работало с UCI)
      const move = window.chess.move(compUci); // { from, to, promotion?, captured? ... }

      // важное: сохраняем UCI, а не SAN/LAN
      window.currentPuzzlesMoves.push(compUci);

      // обновляем позицию на доске
      window.cg.set({
        fen: window.chess.fen(),
        turnColor: toColor(window.chess),
        premovable: { enabled: true },
        movable: {
          free: false,
          color: window.currentPuzzle.pov, // ходит игрок той стороны, которая указана в пазле
          dests: toDests(window.chess),
        },
      });

      // подсветка последнего хода
      window.setPosition([move.from, move.to]);

      // отдать ход зрителям (и сохранить live-состояние на сервере)
      if (typeof window.emitPly === 'function') {
        const fenNow = window.chess.fen();
        const idxNow = typeof window.puzzlesCounter === 'number' ? window.puzzlesCounter : 0;
        window.emitPly(compUci, fenNow); // сервер сам знает shortId/userId из DuelGameModule
      }

      // звуки
      const vol = parseFloat(localStorage.getItem('app-volume-factor') || '1');
      site.sound.play(move.captured ? 'capture' : 'move', vol);

      // инкремент шага в пазле
      window.currentPuzzle.moveIndex++;

      // вдруг была поставлена premove игроком
      window.cg.playPremove();
    } catch (e) {
      console.warn('playComputerMove failed', e);
    }
  }, 300);
};

window.setPosition = (lastMove) => {
  window.cg.set({
    fen: window.chess.fen(),
    lastMove: lastMove ? lastMove : null,
    check: window.chess.isCheck(),
    animation: {
      duration: 100,
    },
    orientation: currentPuzzle.pov,
    highlight: {
      check: true,
    },
    turnColor: window.chess.turn() === 'w' ? 'white' : 'black',
    premovable: {
      enabled: true,
    },
    movable: {
      showDests: true,
      free: false,
      color: currentPuzzle.pov,
      dests: toDests(window.chess),
    },
    events: {
      move: userMove,
    },
  });
};

const Board: React.FC = () => {
  useEffect(() => {
    const cg = Chessground(document.getElementById('dirty'), {
      fen: chess.fen(),
      orientation,

      events: {
        move: userMove,
        insert(elements) {
          resizeHandle(elements, true, 0, true);
        },
      },
      movable: {
        free: false,
        // color: currentPuzzle.pov,
        color: orientation,
        dests: toDests(window.chess),
      },
    });
    window.cg = cg;
    const vpW =
      document.documentElement.clientWidth ||
      window.innerWidth ||
      (window as any).visualViewport?.width ||
      0;
    if (vpW > 600) {
      setZoom(initialZoom);
    } else {
      const boardEl = document.getElementById('dirty') as HTMLElement;
      boardEl.style.width = `${vpW - 60}px`;
      boardEl.style.height = `${vpW - 60}px`;
    }
  }, []);

  return (
    <div className="blue cburnett is2d" style={{ position: 'relative' }}>
      <div id="dirty" className="cg-board-wrap" />
      {/* Промоушен встраивается автоматически */}
    </div>
  );
};

export default Board;

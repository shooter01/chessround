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
import './assets/chessground.css';
import './assets/promotion.css';
import './assets/pieces.css';
import './assets/board.css';
import './assets/theme.css';
import './assets/3d.css';
import './assets/examples.css';
import { log } from '../chessground/units/lib/permalog';
const initialZoom = parseFloat(localStorage.getItem('lichess-dev.cge.zoom') || '100');

// const fen = '8/8/8/8/8/3k4/6p1/3K4 b - - 0 1';
const fen = '3k4/6P1/3K4/8/8/8/8/8 w - - 0 1';

configureSiteSound();

// ===== helpers =====
function fileIndex(key) {
  return key ? key.charCodeAt(0) - 97 : 0; // 'a' -> 0 ... 'h' -> 7
}
function getBoardRoot() {
  // если у тебя другой корень, поменяй селектор
  const root = document.getElementById('dirty');
  return root?.querySelector('cg-board') || root;
}
function getOrientation() {
  // класс ставит chessground на обёртку
  const wrap = document.querySelector('.cg-board-wrap.cg-wrap');
  return wrap?.classList.contains('orientation-white') ? 'white' : 'black';
}

// ===== mount / unmount promotion-choice =====
let promotionHandle = null;

function mountPromotionChoice({ root, dest, pieces, color, orientation, onFinish, onCancel }) {
  if (!root) throw new Error('mountPromotionChoice: root is required');
  const board = root.tagName?.toLowerCase() === 'cg-board' ? root : root.querySelector('cg-board');
  if (!board) throw new Error('mountPromotionChoice: <cg-board> not found');

  // remove previous
  board.querySelector('#promotion-choice')?.remove();

  // left position (same formula as before)
  let left = (7 - fileIndex(dest)) * 12.5;
  if (orientation === 'white') left = 87.5 - left;

  const verticalClass = color === orientation ? 'top' : 'bottom';

  const wrap = document.createElement('div');
  wrap.id = 'promotion-choice';
  wrap.className = verticalClass;
  wrap.style.left = left + '%';

  // cancel on background click
  const cancelHandler = (e) => {
    e.stopPropagation();
    onCancel?.();
    destroy();
  };
  wrap.addEventListener('click', cancelHandler);
  wrap.oncontextmenu = () => false;

  pieces.forEach((role, i) => {
    const square = document.createElement('square');
    const top = (color === orientation ? i : 7 - i) * 12.5;
    square.setAttribute('style', 'top: ' + top + '%;');

    const pieceEl = document.createElement('piece');
    pieceEl.className = `${role} ${color}`;

    square.addEventListener('click', (e) => {
      e.stopPropagation();
      onFinish?.(role);
      destroy();
    });

    square.appendChild(pieceEl);
    wrap.appendChild(square);
  });

  board.appendChild(wrap);

  function destroy() {
    wrap.removeEventListener('click', cancelHandler);
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }

  return { el: wrap, destroy };
}

function hidePromotionUI() {
  if (promotionHandle) {
    promotionHandle.destroy();
    promotionHandle = null;
  } else {
    // подчищаем, если что-то осталось
    getBoardRoot()?.querySelector('#promotion-choice')?.remove();
  }
}

// ===== bridge for promo.start hooks =====
function showPromotionUI(ctrl, rolesOrFalse) {
  if (rolesOrFalse === false) {
    hidePromotionUI();
    return;
  }
  const state = ctrl.getState(); // { dest, ... }
  const dest = state.dest;

  // чей цвет у промо-фигур (по рангу клетки назначения)
  const movingColor = dest && dest[1] === '8' ? 'white' : 'black';
  const orientation = getOrientation();
  const root = getBoardRoot();

  // монтируем
  hidePromotionUI();
  promotionHandle = mountPromotionChoice({
    root,
    dest,
    pieces: rolesOrFalse,
    color: movingColor,
    orientation,
    onFinish: (role) => ctrl.finish(role),
    onCancel: () => ctrl.cancel(),
  });
}

// Простая генерация всех шахматных клеток
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];
type Key = string;
window.chess = new Chess(fen);
export function toColor(chess: Chess): Color {
  return chess.turn() === 'w' ? 'white' : 'black';
}
const promo = new PromotionCtrl({ autoQueenPref: false });

const userMove = (orig: Key, dest: Key, capture: Key): void => {
  const isPromoting = promo.start(
    orig,
    dest,
    {
      submit: (o, d, role) => playUserMove(o, d, role), // ваша логика хода
      show: (ctrl, rolesOrFalse) => {
        if (rolesOrFalse === false) hidePromotionUI();
        else showPromotionUI(ctrl, rolesOrFalse); // <- ctrl первым
      },
    },
    {
      // movingColor: turnColor, // 'white' | 'black'
      movingColor: toColor(window.chess),
      pieceAtOrig: { role: 'pawn', color: toColor(window.chess) }, // {role:'pawn', color:'white'} например
      // pieceAtDest: pieceOnDest, // опционально
      meta: { premove: false, ctrlKey: false },
    },
  );
  if (!isPromoting) playUserMove(orig, dest);
};

const playUserMove = (orig: Key, dest: Key, promotion?: Role): void =>
  playUci(`${orig}${dest}${promotion ? (promotion === 'knight' ? 'n' : promotion[0]) : ''}`, dest);
const playUci = (uci: Uci, dest: string): void => {
  // console.log(`Playing UCI: ${uci}`);
  // console.log(`actual move: ${window.currentPuzzle.expectedMove()}`);
  let sign = '✗';

  // if (uci == window.currentPuzzle.expectedMove()) {
  //   sign = '✓';
  //   // это потом полетит на бек для проверки
  //   window.currentPuzzlesMoves.push(uci);
  // } else {
  //   window.cg.setAutoShapes([{ orig: dest, customSvg: glyphToSvg[sign] }]);

  //   window.addCorrectPuzzle(window.currentPuzzle, false);
  //   setTimeout(() => {
  //     window.setNextPuzzle();
  //   }, 300);
  //   window.setCorrect(false);
  //   site.sound.play(`error`, parseFloat(localStorage.getItem('app-volume-factor') || '1'));

  //   return;
  // }

  const move = chess.move(uci);

  window.cg.set({
    fen: chess.fen(),
    lastMove: [move.from, move.to],
    turnColor: toColor(window.chess),
    orientation: 'black',
    lastMove: [move.from, move.to],
    check: window.chess.isCheck(),
    highlight: {
      check: true,
    },
  });

  if (!window.promoting) {
    // window.cg.setAutoShapes([{ orig: dest, customSvg: glyphToSvg[sign] }]);
    // window.currentPuzzle.moveIndex++;
    // if (window.currentPuzzle.isOver()) {
    //   window.setCorrect(true);
    //   site.sound.play(`correct`, parseFloat(localStorage.getItem('app-volume-factor') || '1'));
    //   setTimeout(() => {
    //     window.setNextPuzzle();
    //   }, 300);
    //   window.addCorrectPuzzle(window.currentPuzzle, true);
    // } else {
    //   // window.setPosition();
    //   window.playComputerMove();
    // }
    // console.log(`isOver: ${window.currentPuzzle.isOver()}`);
  }

  if (move.captured) {
    site.sound.play(`capture`, parseFloat(localStorage.getItem('app-volume-factor') || '1'));
  } else {
    site.sound.play(`move`, parseFloat(localStorage.getItem('app-volume-factor') || '1'));
  }
  return;
};
function setZoom(zoom: number) {
  // ограничим [50..200]%, например
  const z = Math.max(100, Math.min(200, zoom));
  localStorage.setItem('lichess-dev.cge.zoom', String(z));
  const px = (z / 100) * 320;
  const boardEl = document.querySelector('.cg-wrap') as HTMLElement;
  if (boardEl) {
    boardEl.style.width = `${px}px`;
    boardEl.style.height = `${px}px`;
  }
  document.body.dispatchEvent(new Event('chessground.resize'));
}

const Board: React.FC = () => {
  useEffect(() => {
    const cg = Chessground(document.getElementById('dirty'), {
      fen: chess.fen(),
      orientation: 'black',

      events: {
        move: userMove,
        // insert(elements) {
        //   resizeHandle(elements, true, 0, true);
        // },
      },
    });
    window.cg = cg;
    setZoom(initialZoom);
  }, []);

  return (
    <div className="blue cburnett is2d" style={{ position: 'relative' }}>
      <div id="dirty" className="cg-board-wrap" />
      {/* Промоушен встраивается автоматически */}
    </div>
  );
};

export default Board;

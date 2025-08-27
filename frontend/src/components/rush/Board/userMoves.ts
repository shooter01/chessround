import { PromotionCtrl } from './promotionCtrl';
import { showPromotionUI, hidePromotionUI } from './promotionhelpers';
import { toColor } from './toColor';
import { glyphToSvg } from './glyphs';

const promo = new PromotionCtrl({ autoQueenPref: false });

function detectPieceAtOrig(orig: Key) {
  // Вариант через chess.js (если используешь window.chess)
  if (window.chess && typeof window.chess.get === 'function') {
    const p = window.chess.get(orig); // { type:'p|n|b|r|q|k', color:'w|b' } | null
    if (!p) return undefined;
    const roleMap: Record<string, any> = {
      p: 'pawn',
      n: 'knight',
      b: 'bishop',
      r: 'rook',
      q: 'queen',
      k: 'king',
    };
    return { role: roleMap[p.type], color: p.color === 'w' ? 'white' : 'black' };
  }

  // Вариант через chessground (если есть доступ)
  if (typeof ground !== 'undefined' && ground?.state?.pieces) {
    const gPiece = ground.state.pieces.get(orig); // {role,color} | undefined
    if (gPiece) return { role: gPiece.role, color: gPiece.color };
  }

  return undefined;
}

export const userMove = (orig: Key, dest: Key, capture: Key): void => {
  const pieceAtOrig = detectPieceAtOrig(orig); // КЛЮЧЕВОЕ: реальная фигура с orig

  const isPromoting = promo.start(
    orig,
    dest,
    {
      submit: (o, d, role) => playUserMove(o, d, role),
      show: (ctrl, rolesOrFalse) => {
        if (rolesOrFalse === false) hidePromotionUI();
        else showPromotionUI(ctrl, rolesOrFalse);
      },
    },
    {
      pieceAtOrig, // <-- передаём реальную фигуру
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

  if (uci == window.currentPuzzle.expectedMove()) {
    sign = '✓';
    // это потом полетит на бек для проверки
    window.currentPuzzlesMoves.push(uci);
  } else {
    window.cg.setAutoShapes([{ orig: dest, customSvg: glyphToSvg[sign] }]);

    window.addCorrectPuzzle(window.currentPuzzle, false);
    setTimeout(() => {
      window.setNextPuzzle();
    }, 300);
    window.setCorrect(false);
    site.sound.play(`error`, parseFloat(localStorage.getItem('app-volume-factor') || '1'));

    return;
  }

  const move = chess.move(uci);

  window.cg.set({
    fen: chess.fen(),
    lastMove: [move.from, move.to],
    turnColor: toColor(window.chess),
    check: window.chess.isCheck(),
    highlight: {
      check: true,
    },
  });

  if (!window.promoting) {
    window.cg.setAutoShapes([{ orig: dest, customSvg: glyphToSvg[sign] }]);
    window.currentPuzzle.moveIndex++;
    if (window.currentPuzzle.isOver()) {
      window.setCorrect(true);
      site.sound.play(`correct`, parseFloat(localStorage.getItem('app-volume-factor') || '1'));
      setTimeout(() => {
        window.setNextPuzzle();
      }, 300);
      window.addCorrectPuzzle(window.currentPuzzle, true);
    } else {
      // window.setPosition();
      window.playComputerMove();
    }
    // console.log(`isOver: ${window.currentPuzzle.isOver()}`);
  }

  if (move.captured) {
    site.sound.play(`capture`, parseFloat(localStorage.getItem('app-volume-factor') || '1'));
  } else {
    site.sound.play(`move`, parseFloat(localStorage.getItem('app-volume-factor') || '1'));
  }
  return;
};

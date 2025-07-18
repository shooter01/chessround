import { Unit } from './unit';
import { Chessground } from 'chessground';
import { Key } from 'chessground/types.d';

import { Api } from 'chessground/api';
import { Color, Key } from 'chessground/types';
import { Chess, SQUARES } from 'chess.js';
import { glyphToSvg } from './glyphs';
import sound from './sound';
import { lastMoveDrop } from './zh';
import { opposite, parseUci } from 'chessops/util';
window.site = window.site || {};
// site.load is initialized in site.inline.ts (body script)
// site.manifest is fetched
// site.info, site.debug are populated by ui/build
// site.quietMode is set elsewhere
// window.lichess is initialized in ui/api/src/api.ts
site.sound = sound;

// at the top, right after you import site.sound:
const volFactor = parseFloat(localStorage.getItem('app-volume-factor') || '1');
// read the active sound set
const soundTheme = localStorage.getItem('app-sound-theme') || 'default';
// choose folder
const soundBase = soundTheme === 'quake3' ? '/sound/quake' : '/sound';

site.sound.load(`error`, site.sound.url(`${soundBase}/Error.mp3`));
site.sound.load(`correct`, site.sound.url(`${soundBase}/Сorrect.mp3`));
site.sound.load(`move`, site.sound.url(`${soundBase}/Move.mp3`));
site.sound.load(`capture`, site.sound.url(`${soundBase}/Capture.mp3`));
let startX = 0;
let initialZoom = parseFloat(localStorage.getItem('lichess-dev.cge.zoom')!) || 400;

export default function resizeHandle(els, pref, ply, visible?): void {
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

window.chess = new Chess();

export function toDests(chess: Chess): Map<Key, Key[]> {
  const dests = new Map();
  SQUARES.forEach((s) => {
    const ms = chess.moves({ square: s, verbose: true });
    if (ms.length)
      dests.set(
        s,
        ms.map((m) => m.to),
      );
  });
  return dests;
}

export function toColor(chess: Chess): Color {
  return chess.turn() === 'w' ? 'white' : 'black';
}

const userMove = (orig: Key, dest: Key, capture: Key): void => {
  const isPromoting = window.promotion.start(orig, dest, {
    submit: playUserMove,
  });
  if (!isPromoting) playUserMove(orig, dest);
};

window.playComputerMove = (orig: Key, dest: Key): void => {
  setTimeout(() => {
    const move = window.chess.move(currentPuzzle.expectedMove());
    window.currentPuzzlesMoves.push(move.lan);

    window.cg.set({
      fen: window.chess.fen(),
      turnColor: toColor(window.chess),
      premovable: {
        enabled: true,
      },
      movable: {
        free: false,
        color: currentPuzzle.pov,
        dests: toDests(window.chess),
      },
    });

    window.setPosition([move.from, move.to]);

    if (move.captured) {
      site.sound.play(`capture`, parseFloat(localStorage.getItem('app-volume-factor') || '1'));
    } else {
      site.sound.play(`move`, parseFloat(localStorage.getItem('app-volume-factor') || '1'));
    }

    currentPuzzle.moveIndex++;
    cg.playPremove();
    // if (san.includes('+')) sounds.push(`${prefix}Check`);
  }, 300);
};

const playUserMove = (orig: Key, dest: Key, promotion?: Role): void =>
  playUci(`${orig}${dest}${promotion ? (promotion === 'knight' ? 'n' : promotion[0]) : ''}`, dest);

const playUci = (uci: Uci, dest: string): void => {
  console.log(`Playing UCI: ${uci}`);
  console.log(`actual move: ${window.currentPuzzle.expectedMove()}`);
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
    lastMove: [move.from, move.to],
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
    console.log(`isOver: ${window.currentPuzzle.isOver()}`);
  }

  if (move.captured) {
    site.sound.play(`capture`, parseFloat(localStorage.getItem('app-volume-factor') || '1'));
  } else {
    site.sound.play(`move`, parseFloat(localStorage.getItem('app-volume-factor') || '1'));
  }
  return;
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

export const autoSwitch: Unit = {
  name: 'FEN: switch (puzzle bug)',
  run(cont) {
    const configs: Array<() => { fen: string; lastMove: Key[] }> = [
      () => {
        return {
          fen: chess.fen(),
          events: {
            move: userMove,
            insert(elements) {
              resizeHandle(elements, true, 0, true);
            },
          },
        };
      },
    ];
    const cg = Chessground(cont, configs[0]());
    window.cg = cg;
    setZoom(initialZoom);
    return cg;
  },
};

import { Unit } from './unit';
import { Chessground } from 'chessground';
import { Key } from 'chessground/types.d';

import { Api } from 'chessground/api';
import { Color, Key } from 'chessground/types';
import { Chess, SQUARES } from 'chess.js';
import { glyphToSvg } from './glyphs';
import sound from './sound';

const site = window.site || {};
// site.load is initialized in site.inline.ts (body script)
// site.manifest is fetched
// site.info, site.debug are populated by ui/build
// site.quietMode is set elsewhere
// window.lichess is initialized in ui/api/src/api.ts
site.sound = sound;

site.sound.load(`move`, site.sound.url(`/sound/Move.mp3`));
site.sound.load(`capture`, site.sound.url(`/sound/Capture.mp3`));

let startX = 0;
let initialZoom = parseFloat(localStorage.getItem('lichess-dev.cge.zoom')!) || 100;

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

const userMove = (orig: Key, dest: Key): void => {
  console.log(`User move: ${orig} to ${dest}`);

  const isPromoting = window.promotion.start(orig, dest, {
    submit: playUserMove,
  });
  if (!isPromoting) playUserMove(orig, dest);
};

const playComputerMove = (orig: Key, dest: Key): void => {
  setTimeout(() => {
    window.chess.move(currentPuzzle.expectedMove());
    window.cg.set({
      fen: window.chess.fen(),
      turnColor: toColor(window.chess),
      highlight: {
        lastMove: true,
        check: true,
      },
      premovable: {
        enabled: true,
      },

      // lastMove: currentPuzzle.expectedMove(),
      movable: {
        free: false,
        color: toColor(window.chess),
        dests: toDests(window.chess),
      },
    });
    currentPuzzle.moveIndex++;
    site.sound.play(`move`, 1);
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
  } else {
    window.addCorrectPuzzle(window.currentPuzzle, false);
    window.setNextPuzzle();
    return;
  }

  const move = chess.move(uci);

  if (!window.promoting) {
    window.cg.set({
      fen: chess.fen(),
      turnColor: toColor(chess),
      highlight: {
        lastMove: true,
        check: true,
      },
      premovable: {
        enabled: true,
      },
      // check: true,
      movable: {
        free: false,
        color: toColor(chess),
        dests: toDests(chess),
      },
    });
    window.cg.setAutoShapes([{ orig: dest, customSvg: glyphToSvg[sign] }]);
    window.currentPuzzle.moveIndex++;
    if (window.currentPuzzle.isOver()) {
      window.setNextPuzzle();
      window.addCorrectPuzzle(window.currentPuzzle, true);
    } else {
      playComputerMove();
    }
    console.log(`isOver: ${window.currentPuzzle.isOver()}`);
  }
  site.sound.play(`move`, 1);
  return;
};

export const autoSwitch: Unit = {
  name: 'FEN: switch (puzzle bug)',
  run(cont) {
    const configs: Array<() => { fen: string; lastMove: Key[] }> = [
      () => {
        // const chess = new Chess('7k/3P4/8/8/8/8/4K3/8 w - - 0 1');

        return {
          fen: chess.fen(),

          turnColor: toColor(chess),
          movable: {
            free: false,

            color: toColor(chess),
            dests: toDests(chess),
          },
          events: {
            move: userMove,
            insert(elements) {
              resizeHandle(elements, true, 0, true);
            },
          },
        };
      },
      // () => {
      //   return {
      //     orientation: 'white',
      //     fen: '2r2rk1/4bp1p/pp2p1p1/4P3/4bP2/PqN1B2Q/1P3RPP/2R3K1 w - - 1 23',
      //     lastMove: ['b4', 'b3'],
      //   };
      // },
    ];
    const cg = Chessground(cont, configs[0]());
    window.cg = cg;
    setZoom(initialZoom);
    // const delay = 2000;
    // let it = 0;
    // function run() {
    //   if (!cg.state.dom.elements.board.offsetParent) return;
    //   cg.set(configs[++it % configs.length]());
    //   setTimeout(run, delay);
    // }
    // setTimeout(run, delay);
    return cg;
  },
};

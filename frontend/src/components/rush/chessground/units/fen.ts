import { Unit } from './unit';
import { Chessground } from 'chessground';
import { Key } from 'chessground/types.d';

import { Api } from 'chessground/api';
import { Color, Key } from 'chessground/types';
import { Chess, SQUARES } from 'chess.js';
import { glyphToSvg } from './glyphs';

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
      movable: {
        free: false,
        color: toColor(window.chess),
        dests: toDests(window.chess),
      },
    });
    currentPuzzle.moveIndex++;
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
  return;

  // this.redraw();
  // this.redrawQuick();
  // this.redrawSlow();
  // }
  // this.setGround();
  // if (this.run.current.moveIndex < 0) {
  //   this.run.current.moveIndex = 0;
  //   this.setGround();
  // }
  // pubsub.emit('ply', this.run.moves);
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

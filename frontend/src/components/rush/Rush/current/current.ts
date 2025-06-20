import { Chess, opposite, parseUci, san } from 'chessops';
import { parseFen } from 'chessops/fen';
import type { Puzzle } from './interfaces';
import { getNow } from './util';
type Uci = string;

export default class CurrentPuzzle {
  line: Uci[];
  startAt: number;
  moveIndex = -1;
  pov: string;

  constructor(
    readonly index: number,
    readonly puzzle: Puzzle,
  ) {
    this.line = puzzle.moves.split(' ');
    this.pov = opposite(parseFen(puzzle.fen).unwrap().turn);
    this.startAt = getNow();
  }

  position = (index: number = this.moveIndex + 1): Chess => {
    const pos = Chess.fromSetup(parseFen(this.puzzle.fen).unwrap()).unwrap();
    if (index >= 0) this.line.slice(0, index).forEach((uci) => pos.play(parseUci(uci)!));
    return pos;
  };

  expectedMove = (): string => this.line[this.moveIndex + 1];

  lastMove = (): string => this.line[this.moveIndex];

  isOver = (): boolean => this.moveIndex >= this.line.length - 1;

  playSound(prev?: CurrentPuzzle): void {
    // play a combined sound for both the user's move and the opponent move, preferring
    // capture & check. (prev !== this) is where we combine the last move of a previous
    // puzzle with the starting move of a new puzzle
    let prevSan = '';
    if (prev) {
      const index = prev !== this ? prev.line.length - 1 : this.moveIndex - 1;
      if (index > -1) prevSan = san.makeSan(prev.position(index), parseUci(prev.line[index])!);
    }
    const currSan = san.makeSan(
      this.position(this.moveIndex),
      parseUci(this.line[Math.max(this.moveIndex, 0)])!,
    );
    // adding san is garbage of course, but site.sound just cares about x, #, and +
    const combined = this.isOver() ? prevSan : prevSan + currSan;
    site.sound.move({ san: combined, uci: this.lastMove() });
  }
}

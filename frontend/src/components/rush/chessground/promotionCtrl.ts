import type { PiecesDiff } from 'chessground/types';
import type { PromotionRole } from './utilPromotion.ts';
// import { type any } from 'chessground/types';

type PromotionCallback = (orig: Key, dest: Key, role: PromotionRole) => void;

export class PromotionCtrl {
  promoting:
    | false
    | {
        orig: Key;
        dest: Key;
        callback: PromotionCallback;
      } = false;

  constructor(
    readonly any: any,
    readonly redraw: () => void,
  ) {}

  reset = () => {
    this.promoting = false;
  };

  start = (orig: Key, dest: Key, callback: PromotionCallback): boolean =>
    !!this.any((ground) => {
      const piece = ground.state.pieces.get(dest);
      if (
        piece &&
        piece.role === 'pawn' &&
        ((dest[1] === '1' && piece.color === 'black') ||
          (dest[1] === '8' && piece.color === 'white'))
      ) {
        this.promoting = {
          orig: orig,
          dest: dest,
          callback: callback,
        };
        this.redraw();
        return true;
      }
      return false;
    });

  finish = (role: PromotionRole) => {
    if (this.promoting) {
      this.promote(this.promoting.dest, role);
      this.promoting.callback(this.promoting.orig, this.promoting.dest, role);
    }
    this.promoting = false;
    this.redraw();
  };

  promote = (key: Key, role: PromotionRole) =>
    this.any((ground) => {
      const piece = ground.state.pieces.get(key);
      if (piece && piece.role === 'pawn') {
        const pieces: PiecesDiff = new Map();
        pieces.set(key, { color: piece.color, role, promoted: true });
        ground.setPieces(pieces);
      }
    });
}

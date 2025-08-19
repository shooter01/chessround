// promotion-logic.js — чистая логика промоции без UI и без chessground

export const PROMOTABLE_ROLES = ['queen', 'knight', 'rook', 'bishop'];

/** Поведение авто-ферзя */
export const AutoQueen = {
  Never: 0,
  OnPremove: 1,
  Always: 2,
};

/**
 * Проверка, что dest — последняя горизонталь для текущей стороны.
 * @param {string} dest например 'e8'
 * @param {'white'|'black'} movingColor
 */
export function isPromotionSquare(dest, movingColor) {
  const rank = dest && dest[1];
  return (movingColor === 'white' && rank === '8') || (movingColor === 'black' && rank === '1');
}

/**
 * @typedef {Object} Piece
 * @property {'pawn'|'queen'|'rook'|'bishop'|'knight'|'king'} role
 * @property {'white'|'black'} color
 */

/**
 * @typedef {Object} Hooks
 * @property {(orig:string, dest:string, role:string)=>void} submit // финализация промоции (выполнить ход с указанной фигурой)
 * @property {(ctrl:PromotionCtrl, roles:string[]|false)=>void} [show] // показать/скрыть UI выбора ролей
 */

/**
 * Контекст позиции, необходимый для чистой логики
 * @typedef {Object} StartCtx
 * @property {'white'|'black'} movingColor // чей ход (до применения хода)
 * @property {Piece|undefined} [pieceAtOrig] // фигура на orig (важно для премувов)
 * @property {Piece|undefined} [pieceAtDest] // фигура на dest (опционально)
 * @property {{premove?:boolean, ctrlKey?:boolean}} [meta]
 */

export class PromotionCtrl {
  /**
   * @param {Object} [opts]
   * @param {number} [opts.autoQueenPref=AutoQueen.Never]
   * @param {()=>void} [opts.onCancel]
   */
  constructor({ autoQueenPref = AutoQueen.Never, onCancel } = {}) {
    this.autoQueenPref = autoQueenPref;
    this.onCancel = typeof onCancel === 'function' ? onCancel : () => {};
    /** @type {{orig:string, dest:string, pre:boolean, hooks:Hooks}|undefined} */
    this.promoting = undefined;
    /** @type {string|undefined} */
    this.prePromotionRole = undefined;
  }

  /**
   * Запустить логику промоции для хода.
   * Ничего не мутирует — только решает: авто-ферзь, использовать предварительный выбор,
   * или запросить UI выбора.
   *
   * @param {string} orig
   * @param {string} dest
   * @param {Hooks} hooks
   * @param {StartCtx} ctx
   * @param {boolean} [forceAutoQueen=false]
   * @param {string[]} [roles=PROMOTABLE_ROLES]
   * @returns {boolean} true — если ход обрабатывается как промоция (авто/ожидание выбора)
   */
  start(orig, dest, hooks, ctx, forceAutoQueen = false, roles = PROMOTABLE_ROLES) {
    const meta = ctx?.meta || {};
    const premovePiece = ctx?.pieceAtOrig;
    const piece = premovePiece || ctx?.pieceAtDest;

    if (!piece || piece.role !== 'pawn') return false;
    if (!isPromotionSquare(dest, ctx.movingColor)) return false;

    // Если заранее выбран роль для премува — используем её
    if (this.prePromotionRole && meta.premove) {
      this.doPromote({ orig, dest, hooks }, this.prePromotionRole);
      return true;
    }

    // Авто-ферзь (если не зажат Ctrl и нет активного выбора)
    const shouldAutoQueen =
      !meta.ctrlKey &&
      !this.promoting &&
      (this.autoQueenPref === AutoQueen.Always ||
        (this.autoQueenPref === AutoQueen.OnPremove && !!premovePiece) ||
        !!forceAutoQueen);

    if (shouldAutoQueen) {
      if (premovePiece) this.setPrePromotion(dest, 'queen');
      else this.doPromote({ orig, dest, hooks }, 'queen');
      return true;
    }

    // Нужен выбор роли — сообщаем UI
    this.promoting = { orig, dest, pre: !!meta.premove, hooks };
    hooks.show?.(this, roles);
    return true;
  }

  /** Отмена текущей промоции */
  cancel() {
    this.cancelPrePromotion();
    if (this.promoting) {
      const p = this.promoting;
      this.promoting = undefined;
      p.hooks.show?.(this, false);
      this.onCancel();
    }
  }

  /** Сброс предварительного выбора роли для премувов */
  cancelPrePromotion() {
    this.prePromotionRole = undefined;
  }

  /**
   * Завершить промоцию выбранной фигурой
   * @param {'queen'|'rook'|'bishop'|'knight'|'king'} role
   */
  finish(role) {
    const promoting = this.promoting;
    if (!promoting) return;

    this.promoting = undefined;
    if (promoting.pre) this.setPrePromotion(promoting.dest, role);
    else this.doPromote(promoting, role);

    promoting.hooks.show?.(this, false);
  }

  // --- helpers/state ---

  isPromoting() {
    return !!this.promoting;
  }

  getPrePromotionRole() {
    return this.prePromotionRole;
  }

  getState() {
    const p = this.promoting;
    return p ? { promoting: true, orig: p.orig, dest: p.dest, pre: p.pre } : { promoting: false };
  }

  // --- внутреннее ---

  doPromote(promoting, role) {
    // Никаких побочных эффектов — только отдать решение наружу
    promoting.hooks.submit(promoting.orig, promoting.dest, role);
  }

  setPrePromotion(dest, role) {
    this.prePromotionRole = role;
    // Здесь нет визуализации; UI может сам подсветить dest и роль по getState()/getPrePromotionRole()
  }
}

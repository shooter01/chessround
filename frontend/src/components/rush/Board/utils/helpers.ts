// utils/helpers.ts
import { init } from 'snabbdom';
import { h } from 'snabbdom';
import { classModule, propsModule, styleModule, eventListenersModule } from 'snabbdom';
import { Chess } from 'chess.js';
import resizeHandle from '../utils/resize'; // поправь путь, если нужно
import { initialGround } from '../../chessground/ground';
import type { PromotionCtrl, WithGround } from '../../chessground/promotionCtrl';
import { log } from '../../chessground/units/lib/permalog';

/**
 * Упрощённый withGround — вызывает переданную функцию, если есть текущий chessground.
 */
export function withGround(f: (g: any) => any) {
  const g = (window as any).cg;
  return g ? f(g) : undefined;
}

/**
 * Создаёт функцию redraw для promotion UI (snabbdom).
 */
export function makeRedraw(
  promotionRootRef: React.MutableRefObject<HTMLElement | null>,
  promotionVnodeRef: React.MutableRefObject<any>,
): () => void {
  const patch = init([classModule, propsModule, styleModule, eventListenersModule]);

  return () => {
    if (!promotionRootRef.current) return;
    const promotion = (window as any).promotion as PromotionCtrl;
    if (!promotion) return;

    const maybeVNode = promotion.view?.();
    const containerVNode = h('div.promotion-wrapper', [maybeVNode || h('!')]);

    promotionVnodeRef.current = patch(
      promotionVnodeRef.current || promotionRootRef.current,
      containerVNode,
    );
  };
}

/**
 * Гарантирует наличие корня для promotion с перекомпоновкой.
 * Самостоятельно ставит promotionRootRef и initial vnode.
 */
export function ensurePromotionRoot(
  dirtyEl: HTMLElement,
  promotionRootRef: React.MutableRefObject<HTMLElement | null>,
  promotionVnodeRef: React.MutableRefObject<any>,
  redraw: () => void,
) {
  const tryEnsure = () => {
    const cgContainer = dirtyEl.querySelector('cg-container') as HTMLElement | null;
    if (!cgContainer) {
      setTimeout(tryEnsure, 30);
      return;
    }
    if (getComputedStyle(cgContainer).position === 'static') {
      cgContainer.style.position = 'relative';
    }
    if (!promotionRootRef.current) {
      const promoEl = document.createElement('div');
      Object.assign(promoEl.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        pointerEvents: 'none',
        zIndex: '10',
      });
      cgContainer.appendChild(promoEl);
      promotionRootRef.current = promoEl;
      promotionVnodeRef.current = promoEl;
      // initial render
      redraw();
    }
  };
  tryEnsure();
}

/**
 * Инициализирует chessground и возвращает его. Привязывает userMove handler.
 */
export function initChessground(
  container: HTMLElement,
  userMove: (orig: string, dest: string, meta?: any) => void,
): any {
  const cg = ((window as any).cg = (window as any).Chessground
    ? (window as any).Chessground(container, {
        fen: '8/8/8/8/8/4k3/1p6/4K3 b - - 0 1',
        orientation: 'black',
        turnColor: 'black',
        events: {
          move: userMove,
        },
      })
    : null);
  return cg;
}

/**
 * Ставит начальное состояние ground.
 */
export function setInitialGround() {
  withGround((g: any) => g.set(initialGround()));
}

/**
 * Фабрика для хэндлера хода пользователя (без промоушена).
 */
export function makePlayUserMove(
  chess: Chess,
): (orig: string, dest: string, promotion?: string) => void {
  return (orig: string, dest: string, promotion?: string) => {
    let uci = `${orig}${dest}`;
    if (promotion) {
      uci += promotion === 'knight' ? 'n' : promotion[0];
    }
    log(orig, dest, promotion);
    const move = chess.move(uci as any);
    if (!move) return;

    const cg = (window as any).cg;
    if (cg) {
      cg.set({
        lastMove: [move.from, move.to],
        check: chess.isCheck(),
        highlight: { check: true },
      });
    }

    // здесь можно вставить звуки/другие эффекты в зависимости от move.captured и т.п.
  };
}

/**
 * Обёртка, которая комбинирует PromotionCtrl и playUserMove.
 */
export function makeUserMoveHandler(
  promotionCtrl: PromotionCtrl,
  playUserMove: (orig: string, dest: string, promotion?: string) => void,
) {
  return (orig: string, dest: string, meta?: any) => {
    if (!promotionCtrl) return;
    const isPromoting = promotionCtrl.start(
      orig,
      dest,
      {
        submit: (o: string, d: string, role: string) => {
          playUserMove(o, d, role);
        },
        show: (_ctrl: any, _roles: any) => {
          // noop или подсветка, если нужно
        },
      },
      meta,
    );
    if (!isPromoting) {
      playUserMove(orig, dest);
    }
  };
}

/**
 * Применяет ресайз (аналог текущего поведения).
 */
export function applyResize(
  el: HTMLElement,
  pref: any,
  ply: number,
  visible: (p: number) => boolean,
) {
  const width = 300;
  const w = typeof width === 'number' ? `${width}px` : width;
  el.style.width = w;
  el.style.height = w;
  resizeHandle({ container: el }, pref, ply, visible);
}

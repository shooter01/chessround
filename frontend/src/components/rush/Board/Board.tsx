// Board.tsx
import * as React from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { init } from 'snabbdom';
import { h } from 'snabbdom';
import { classModule, propsModule, styleModule, eventListenersModule } from 'snabbdom';
import { Chessground } from 'chessground';
import resizeHandle from './utils/resize';
import './assets/chessground.css';
import './assets/promotion.css';
import './assets/pieces.css';
import './assets/board.css';
import './assets/theme.css';
import './assets/3d.css';
import './assets/examples.css';
import { PromotionCtrl, WithGround } from '../chessground/promotionCtrl';
import { initialGround } from '../chessground/ground';
import { log } from '../chessground/units/lib/permalog';

const Board: React.FC = () => {
  const dirtyRef = useRef<HTMLDivElement | null>(null);
  const promotionRootRef = useRef<HTMLElement | null>(null);
  const promotionVnodeRef = useRef<any>(null); // для snabbdom patch

  // держим шахматное состояние отдельно, если нужно
  const chessRef = useRef<Chess>(new Chess());
  window.chess = chessRef.current;

  useEffect(() => {
    if (!dirtyRef.current) return;

    // инициализируем chessground
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).cg = Chessground(dirtyRef.current, {
      fen: '8/8/8/8/8/4k3/1p6/4K3 b - - 0 1',
      // fen: '2k5/5P2/2K5/8/8/8/8/8 w - - 0 1',
      // orientation: 'white',
      orientation: 'black',
      turnColor: 'black',
      events: {
        move: userMove,
      },
    });
    chess.load('8/8/8/8/8/4k3/1p6/4K3 b - - 0 1');
    // chess.load('2k5/5P2/2K5/8/8/8/8/8 w - - 0 1');
    console.log(chess.turn());

    const withGround: WithGround = (f: any) => {
      const g = (window as any).cg as any;
      return g ? f(g) : undefined;
    };

    const setGround = () =>
      withGround((g: any) => g.set(initialGround(/* если нужен контекст, адаптируй */)));

    // snabbdom-патчер для промоушена
    const patch = init([classModule, propsModule, styleModule, eventListenersModule]);

    // redraw, который PromotionCtrl будет вызывать
    const redraw = () => {
      if (!promotionRootRef.current) return;
      const promotion = (window as any).promotion as PromotionCtrl;
      if (!promotion) return;

      const maybeVNode = promotion.view?.(); // может быть undefined
      const containerVNode = h('div.promotion-wrapper', [maybeVNode || h('!')]);

      promotionVnodeRef.current = patch(
        promotionVnodeRef.current || promotionRootRef.current,
        containerVNode,
      );
    };

    const ensurePromotionRoot = () => {
      const cgContainer = dirtyRef.current?.querySelector('cg-container') as HTMLElement | null;
      if (!cgContainer) {
        // если ещё не создан, попробуем через чуть-чуть
        setTimeout(ensurePromotionRoot, 30);
        return;
      }

      // чтобы absolutely positioned overlay работал относительно контейнера
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
          pointerEvents: 'none', // внутренние элементы могут переопределить
          zIndex: '10',
        });
        cgContainer.appendChild(promoEl);
        promotionRootRef.current = promoEl;
        promotionVnodeRef.current = promoEl;
        // initial render
        redraw();
      }
    };

    // создаём контроллер промоушена
    (window as any).promotion = new PromotionCtrl(withGround, setGround, redraw);

    // начальное рендерение promotion (пусто)
    if (!promotionRootRef.current) {
      // создаём DOM-элемент для snabbdom-промоушена и вставляем поверх доски
      const promoEl = document.createElement('div');
      promoEl.style.position = 'absolute';
      promoEl.style.top = '0';
      promoEl.style.left = '0';
      promoEl.style.right = '0';
      promoEl.style.bottom = '0';
      promoEl.style.pointerEvents = 'none'; // может быть переопределено внутри
      // контейнер внутри относительно родителя
      dirtyRef.current.style.position = 'relative';
      ensurePromotionRoot();

      // dirtyRef.current.appendChild(promoEl);
      // promotionRootRef.current = promoEl;
      // promotionVnodeRef.current = promoEl;
    }

    // размер (аналог jQuery)
    const width = 300;
    const el = dirtyRef.current;
    const w = typeof width === 'number' ? `${width}px` : width;
    el.style.width = w;
    el.style.height = w;

    // вызов resizeHandle
    const visible = (p: number) => true;
    const pref = {}; // подставь нужные настройки
    let ply = 0; // актуализируй, если изменяется
    resizeHandle({ container: el }, pref, ply, visible);

    // initial draw promotion (чтобы очистить)
    redraw();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Обёртка хода от пользователя
  const playUserMove = useCallback((orig: string, dest: string, promotion?: string) => {
    // формируем UCI, с учётом промоушена
    let uci = `${orig}${dest}`;
    if (promotion) {
      // 'n' для knight, иначе первая буква
      uci += promotion === 'knight' ? 'n' : promotion[0];
    }

    log(orig, dest, promotion);

    const chess = chessRef.current;
    const move = chess.move(uci as any); // типизируй по необходимости
    if (!move) {
      // неверный ход — обработай ошибку
      return;
    }

    // обновляем chessground визуально
    const cg = (window as any).cg;
    cg.set({
      lastMove: [move.from, move.to],
      check: chess.isCheck(),
      highlight: { check: true },
    });

    // пример: показать автошап или звук
    if (move.captured) {
      // site.sound.play('capture', ...);
    } else {
      // site.sound.play('move', ...);
    }
  }, []);

  // move handler, прокидываем promotion hooks
  const userMove = useCallback(
    (orig: string, dest: string, meta?: any) => {
      const promotionCtrl = (window as any).promotion as PromotionCtrl;
      if (!promotionCtrl) return;
      log(orig, dest, meta);
      const isPromoting = promotionCtrl.start(
        orig,
        dest,
        {
          submit: (o: string, d: string, role: string) => {
            playUserMove(o, d, role);
          },
          show: (ctrl: any, roles: any) => {
            // тут можешь, например, подсветить варианты — необязательно
          },
        },
        meta,
      );

      if (!isPromoting) {
        playUserMove(orig, dest);
      }
      // после хода/промоушена нужно перерисовать promotion UI
      // PromotionCtrl сам вызывает redraw при необходимости
    },
    [playUserMove],
  );

  return (
    <div className="blue cburnett is2d" style={{ position: 'relative' }}>
      <div id="dirty" ref={(r) => (dirtyRef.current = r)} className="cg-board-wrap" />
      {/* Промоушен встраивается автоматически внутрь #dirty через snabbdom в useEffect */}
    </div>
  );
};

export default Board;

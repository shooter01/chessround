// main.ts
import { h, init, VNode, classModule, attributesModule, eventListenersModule } from 'snabbdom';
import * as fen from './units/fen';
import { Api } from 'chessground/api';
import { Unit } from './units/unit';
import { PromotionCtrl, WithGround } from './promotionCtrl';
import { initialGround } from './ground.ts';
// import { withGround } from './utilPromotion';
export type Color = 'white' | 'black';

const withGround: WithGround = (f) => {
  const g = window.cg as Api | undefined;
  console.log(g?.getFen());

  return g ? f(g) : undefined;
};

export function run(element: Element): {
  setColor: (c: Color) => void;
  setShowPromotion: (show: boolean) => void;
} {
  const patch = init([classModule, attributesModule, eventListenersModule]);
  let vnode: VNode;
  let cg: Api;
  let unit: Unit;
  window.addEventListener('themechange', () => redraw());
  window.addEventListener('boardchange', () => redraw());

  // Контрол для звуков/сброса (по желанию)
  // const promotionCtrl = new PromotionCtrl(
  //   (fn) => {
  //     fn(cg);
  //     return true;
  //   },
  //   () => redraw(),
  // );

  // Цвет фигур на панели превращения
  // Для зума
  let startX = 0;
  let startZoom = parseFloat(localStorage.getItem('lichess-dev.cge.zoom')!) || 100;

  // function onDrag(e: MouseEvent) {
  //   const dx = e.clientX - startX;
  //   const newZoom = startZoom + dx * 0.5;
  //   setZoom(newZoom);
  // }
  // function stopDrag() {
  //   window.removeEventListener('mousemove', onDrag);
  //   window.removeEventListener('mouseup', stopDrag);
  //   document.body.style.cursor = '';
  //   // сохранить новый зум
  //   startZoom = parseFloat(localStorage.getItem('lichess-dev.cge.zoom')!) || startZoom;
  // }
  // function startDrag(e: MouseEvent) {
  //   e.preventDefault();
  //   startX = e.clientX;
  //   document.body.style.cursor = 'ew-resize';
  //   window.addEventListener('mousemove', onDrag);
  //   window.addEventListener('mouseup', stopDrag);
  // }

  function redraw() {
    vnode = patch(vnode || element, render());
  }

  // Инициализация chessground
  function runUnit(v: VNode) {
    const el = v.elm as HTMLElement;
    el.className = 'cg-wrap';
    cg = unit.run(el);
  }
  const setGround = () => withGround((g) => g.set(initialGround(this)));

  window.promotion = new PromotionCtrl(withGround, setGround, redraw);

  // Тестовый overlay превращения
  // function renderPromotion(): VNode | null {
  //   if (!showPromo) return null; // <-- проверяем флаг!
  //   const promo = {
  //     orig: 'd7',
  //     dest: 'd8',
  //     callback: (_o: string, _d: string, role: string) => {
  //       console.log(`Picked ${role}`);
  //     },
  //   };
  //   const roles = ['queen', 'rook', 'bishop', 'knight'];
  //   const vert = promo.dest[1] === '8' ? 'top' : 'bottom';
  //   const fileIdx = 'abcdefgh'.indexOf(promo.dest[0]);
  //   const leftPct = fileIdx * 12.5;

  //   return h(
  //     `div#promotion-choice.${vert}`,
  //     {
  //       style: {
  //         position: 'absolute',
  //         width: '12.5%',
  //         height: '50%',
  //         left: `${leftPct}%`,
  //         [vert]: '0%',
  //         pointerEvents: 'none',
  //       },
  //     },
  //     roles.map((role, i) =>
  //       h(
  //         'square',
  //         {
  //           style: {
  //             position: 'absolute',
  //             width: '100%',
  //             height: '12.5%',
  //             top: `${i * 12.5}%`,
  //             cursor: 'pointer',
  //             pointerEvents: 'all',
  //           },
  //           on: {
  //             click: (e: MouseEvent) => {
  //               e.stopPropagation();
  //               promo.callback(promo.orig, promo.dest, role);
  //             },
  //           },
  //         },
  //         h(`piece.${role}.${promoColor}`),
  //       ),
  //     ),
  //   );
  // }

  // Собираем VNode-дерево
  function render(): VNode {
    // read saved themes (fallback to 'green' board, 'cburnett' pieces)
    const boardTheme = localStorage.getItem('app-board-theme') || 'green';
    const pieceTheme = localStorage.getItem('app-piece-theme') || 'cburnett';

    // section gets two classes: one for board BG, one for piece set
    const sectionClass = `section.${boardTheme}.${pieceTheme}`;

    return h('div#chessground-examples', [
      h(sectionClass, { style: { position: 'relative', overflow: 'visible' } }, [
        h('div.cg-wrap-container', { style: { position: 'relative', overflow: 'visible' } }, [
          // 1) Chessground board container
          h('div.cg-wrap', {
            hook: { insert: runUnit, postpatch: runUnit },
          }),
          window.promotion.view(),
          // …any overlays, promotion UI, etc.
        ]),

        // zoom handle
        // h('div.resize-handle.flyout-btn', { on: { mousedown: startDrag } }, [
        //   h(
        //     'svg',
        //     {
        //       attrs: {
        //         width: '16',
        //         height: '16',
        //         viewBox: '0 0 24 24',
        //         fill: 'none',
        //         stroke: '#333',
        //         'stroke-width': '2',
        //         'stroke-linecap': 'round',
        //         'stroke-linejoin': 'round',
        //       },
        //     },
        //     [
        //       h('polyline', { attrs: { points: '4 17 10 11 4 5' } }),
        //       h('polyline', { attrs: { points: '20 17 14 11 20 5' } }),
        //     ],
        //   ),
        // ]),

        // orientation toggle
        // h('div.toggle-orient.flyout-btn', { on: { click: () => cg.toggleOrientation() } }, [
        //   h(
        //     'svg',
        //     {
        //       attrs: {
        //         width: '16',
        //         height: '16',
        //         viewBox: '0 0 24 24',
        //         fill: 'none',
        //         stroke: '#333',
        //         'stroke-width': '2',
        //         'stroke-linecap': 'round',
        //         'stroke-linejoin': 'round',
        //       },
        //     },
        //     [
        //       h('polyline', { attrs: { points: '23 4 23 10 17 10' } }),
        //       h('polyline', { attrs: { points: '1 20 1 14 7 14' } }),
        //       h('path', {
        //         attrs: {
        //           d: 'M3.51 9a9 9 0 0114.13-3.36L23 10 ' + 'M1 14l4.36 4.36A9 9 0 0020.49 15',
        //         },
        //       }),
        //     ],
        //   ),
        // ]),

        // …any other controls
      ]),
    ]);
  }

  // Старт
  unit = fen.autoSwitch;
  redraw();

  // return {
  //   setColor(c: Color) {
  //     promoColor = c;
  //     redraw();
  //   },
  //   setShowPromotion(show: boolean) {
  //     showPromo = show;
  //     redraw();
  //   },
  // };
}

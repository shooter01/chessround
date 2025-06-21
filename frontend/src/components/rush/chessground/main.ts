import { h, init, VNode, classModule, attributesModule, eventListenersModule } from 'snabbdom';
import * as fen from './units/fen';
import { Api } from 'chessground/api';
import page from 'page';
import { Unit, list } from './units/unit';
import { PromotionCtrl } from './promotionCtrl';

export function run(element: Element) {
  const patch = init([classModule, attributesModule, eventListenersModule]);

  const lastZoom = parseFloat(localStorage.getItem('lichess-dev.cge.zoom')!) || 100;
  const STORAGE_KEY = 'lichess-dev.cge.zoom';

  let currentZoom = parseFloat(localStorage.getItem(STORAGE_KEY)!) || 100;

  let unit: Unit, cg: Api, vnode: VNode;

  function redraw() {
    vnode = patch(vnode || element, render());
  }

  function setZoom(zoom: number) {
    const width = (zoom / 100) * 320;
    const el = document.querySelector('.cg-wrap') as HTMLElement;
    if (el) {
      el.style.width = `${width}px`;
      el.style.height = `${width}px`;
    }
    const el3d = document.querySelector('.in3d .cg-wrap') as HTMLElement;
    if (el3d) {
      el3d.style.height = `${(width * 464.5) / 512}px`;
    }
    document.body.dispatchEvent(new Event('chessground.resize'));
  }
  const promotionCtrl = new PromotionCtrl(
    (fn) => {
      fn(cg);
      return true;
    },
    () => redraw(),
  );
  // drag-handlers
  let startX: number;
  let startZoom: number;
  function onDrag(e: MouseEvent) {
    const dx = e.clientX - startX;
    // 1px = 0.5% масштаб
    const newZoom = startZoom + dx * 0.5;
    setZoom(newZoom);
  }
  function stopDrag() {
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', stopDrag);
    document.body.style.cursor = '';
  }
  function startDrag(e: MouseEvent) {
    e.preventDefault();
    startX = e.clientX;
    startZoom = currentZoom;
    document.body.style.cursor = 'ew-resize';
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag);
  }

  function runUnit(vnode: VNode) {
    const el = vnode.elm as HTMLElement;
    el.className = 'cg-wrap';
    cg = unit.run(el);
    window['cg'] = cg;

    if (currentZoom !== 100) setZoom(currentZoom);
  }

  function renderPromotion() {
    // 1) Моковые данные для теста
    const promo = {
      orig: 'd7',
      dest: 'd8',
      callback: (orig, dest, role) => {
        console.log(`User picked ${role} for ${orig}->${dest}`);
        // здесь можете вызвать promotionCtrl.finish(role) и cg.move(...)
      },
    };

    // 2) порядок ролей при превращении
    const roles = ['queen', 'rook', 'bishop', 'knight'];

    // 3) куда позиционировать: если пешка доходит до 8-й — панель сверху ('top'), иначе снизу ('bottom')
    const vert = promo.dest[1] === '8' ? 'top' : 'bottom';

    // 4) по какому файлу (a..h) — в процентах от ширины
    const fileIdx = 'abcdefgh'.indexOf(promo.dest[0]);
    // const leftPct = fileIdx * 12.5; // бывает 0, 12.5, 25, …, 87.5
    const leftPct = 0; // бывает 0, 12.5, 25, …, 87.5

    return h(
      `div#promotion-choice.${vert}`,
      {
        style: {
          position: 'absolute',
          width: '12.5%', // одна клетка
          height: '50%', // 4 клетки
          left: `${leftPct}%`,
          [vert]: '0%',
          pointerEvents: 'none',
        },
      },
      roles.map((role, i) =>
        h(
          'square',
          {
            style: {
              position: 'absolute',
              width: '100%',
              height: '12.5%',
              top: `${i * 12.5}%`,
              cursor: 'pointer',
              pointerEvents: 'all',
            },
            on: {
              click: (e) => {
                e.stopPropagation();
                promo.callback(promo.orig, promo.dest, role);
                // если нужно — сброс состояния:
                // promotionCtrl.reset();
                // redraw();
              },
            },
          },
          // визуализация фигуры (зависит от вашего CSS .piece.queen.white и т.д.)
          h(`piece.${role}.white`),
        ),
      ),
    );
  }
  function render() {
    return h('div#chessground-examples', [
      h('section.blue.merida', [
        h('div.cg-wrap-container', [
          renderPromotion(),

          // сама доска
          h('div.cg-wrap', {
            hook: { insert: runUnit, postpatch: runUnit },
          }),

          // кнопка «Toggle orientation»
          h(
            'div.toggle-orient.flyout-btn',
            {
              on: {
                click() {
                  cg.toggleOrientation();
                },
              },
            },
            [
              // тут можно свою SVG-иконку, или FontAwesome
              h(
                'svg',
                {
                  attrs: {
                    width: '16',
                    height: '16',
                    viewBox: '0 0 24 24',
                    fill: 'none',
                    stroke: '#333',
                    'stroke-width': '2',
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round',
                  },
                },
                [
                  // иконка «две стрелки вращения»
                  h('polyline', { attrs: { points: '23 4 23 10 17 10' } }),
                  h('polyline', { attrs: { points: '1 20 1 14 7 14' } }),
                  h('path', {
                    attrs: {
                      d: 'M3.51 9a9 9 0 0114.13-3.36L23 10\n M1 14l4.36 4.36A9 9 0 0020.49 15',
                    },
                  }),
                ],
              ),
            ],
          ),

          // хендл для зума
          h('div.resize-handle.flyout-btn', { on: { mousedown: startDrag } }, [
            h(
              'svg',
              {
                attrs: {
                  width: '16',
                  height: '16',
                  viewBox: '0 0 24 24',
                  fill: 'none',
                  stroke: '#333',
                  'stroke-width': '2',
                  'stroke-linecap': 'round',
                  'stroke-linejoin': 'round',
                },
              },
              [
                h('polyline', { attrs: { points: '4 17 10 11 4 5' } }),
                h('polyline', { attrs: { points: '20 17 14 11 20 5' } }),
              ],
            ),
          ]),
        ]),

        h('p', unit.name),
      ]),

      h('control', [
        // убираем старый инпут «Zoom» и кнопку,
        // т.к. всё переехало во flyout
      ]),
    ]);
  }

  // page({ click: false, popstate: false, dispatch: false, hashbang: true });
  // page('/:id', (ctx) => {
  unit = fen.autoSwitch;
  redraw();
  // });
  // page(location.hash.slice(2) || '/0');
}

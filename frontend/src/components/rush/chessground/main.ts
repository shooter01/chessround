import { h, init, VNode, classModule, attributesModule, eventListenersModule } from 'snabbdom';
import * as fen from './units/fen';
import { Api } from 'chessground/api';
import page from 'page';
import { Unit, list } from './units/unit';

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

  function render() {
    return h('div#chessground-examples', [
      h('section.blue.merida', [
        h('div.cg-wrap-container', [
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

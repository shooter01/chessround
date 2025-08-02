type VisibleFn = (ply: number) => boolean;

export default function resizeHandle(
  els: { container: HTMLElement },
  pref: any,
  ply: number,
  visible?: VisibleFn,
): void {
  // можно учитывать pref, если нужно:
  // if (pref === ShowResizeHandle.Never) return;

  // reuse existing <cg-resize> or create once
  let el = els.container.querySelector('cg-resize') as HTMLElement | null;
  if (!el) {
    el = document.createElement('cg-resize');
    els.container.appendChild(el);
  }

  // управление видимостью (если нужна): пример вызова toggle при изменении ply снаружи
  const toggle = (currentPly: number) => {
    if (!visible) return;
    el!.classList.toggle('none', !visible(currentPly));
  };
  toggle(ply);
  // если есть внешний pubsub, можно туда подписаться: pubsub.on('ply', toggle);

  const startResize = (start: MouseEvent | TouchEvent) => {
    start.preventDefault();

    const mousemoveEvent = start.type === 'touchstart' ? 'touchmove' : 'mousemove';
    const mouseupEvent = start.type === 'touchstart' ? 'touchend' : 'mouseup';
    const startPos = eventPosition(start);
    if (!startPos) return;

    let initialZoom = getInitialZoom();
    let zoom = initialZoom;

    const resize = (move: MouseEvent | TouchEvent) => {
      const pos = eventPosition(move);
      if (!pos) return;
      const delta = pos[0] - startPos[0] + pos[1] - startPos[1];
      zoom = Math.round(Math.max(50, Math.max(0, initialZoom + delta / 10)));

      document.body.style.setProperty('---zoom', zoom.toString());
      window.dispatchEvent(new Event('resize'));
      setZoom(zoom);
    };

    document.body.classList.add('resizing');
    document.addEventListener(mousemoveEvent, resize);

    const cleanup = () => {
      document.removeEventListener(mousemoveEvent, resize);
      document.body.classList.remove('resizing');
    };

    document.addEventListener(
      mouseupEvent,
      () => {
        cleanup();
      },
      { once: true },
    );
  };

  el.addEventListener('touchstart', startResize, { passive: false });
  el.addEventListener('mousedown', startResize, { passive: false });
}

function eventPosition(e: any): [number, number] | undefined {
  if (typeof e.clientX === 'number' && typeof e.clientY === 'number') {
    return [e.clientX, e.clientY];
  }
  if (e.targetTouches?.[0]) {
    return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
  }
  if (e.changedTouches?.[0]) {
    return [e.changedTouches[0].clientX, e.changedTouches[0].clientY];
  }
  return;
}

function getInitialZoom(): number {
  const stored = localStorage.getItem('lichess-dev.cge.zoom');
  const parsed = stored ? parseInt(stored, 10) : NaN;
  if (!isNaN(parsed)) return parsed;
  return 100;
}

function setZoom(zoom: number) {
  // ограничиваем, например, [100..200]
  const z = Math.max(100, Math.min(200, zoom));
  localStorage.setItem('lichess-dev.cge.zoom', String(z));
  const px = (z / 100) * 320;
  const boardEl = document.querySelector('.cg-wrap') as HTMLElement | null;
  if (boardEl) {
    boardEl.style.width = `${px}px`;
    boardEl.style.height = `${px}px`;
  }
  document.body.dispatchEvent(new Event('chessground.resize'));
}

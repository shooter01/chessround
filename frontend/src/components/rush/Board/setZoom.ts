export function setZoom(zoom: number) {
  // ограничим [50..200]%, например
  const z = Math.max(100, Math.min(200, zoom));
  localStorage.setItem('lichess-dev.cge.zoom', String(z));
  const px = (z / 100) * 320;
  const boardEl = document.querySelector('.cg-wrap') as HTMLElement;
  if (boardEl) {
    boardEl.style.width = `${px}px`;
    boardEl.style.height = `${px}px`;
  }
  document.body.dispatchEvent(new Event('chessground.resize'));
}

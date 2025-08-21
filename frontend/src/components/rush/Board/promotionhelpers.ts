// ===== helpers =====
function fileIndex(key) {
  return key ? key.charCodeAt(0) - 97 : 0; // 'a' -> 0 ... 'h' -> 7
}
function getBoardRoot() {
  // если у тебя другой корень, поменяй селектор
  const root = document.getElementById('dirty');
  return root?.querySelector('cg-board') || root;
}
function getOrientation() {
  // класс ставит chessground на обёртку
  const wrap = document.querySelector('.cg-board-wrap.cg-wrap');
  return wrap?.classList.contains('orientation-white') ? 'white' : 'black';
}

// ===== mount / unmount promotion-choice =====
let promotionHandle = null;

function mountPromotionChoice({ root, dest, pieces, color, orientation, onFinish, onCancel }) {
  if (!root) throw new Error('mountPromotionChoice: root is required');
  const board = root.tagName?.toLowerCase() === 'cg-board' ? root : root.querySelector('cg-board');
  if (!board) throw new Error('mountPromotionChoice: <cg-board> not found');

  // remove previous
  board.querySelector('#promotion-choice')?.remove();

  // на всякий: чтобы абсолют позиционировался относительно доски
  const cs = getComputedStyle(board);
  if (cs.position === 'static') board.style.position = 'relative';

  // left позиция
  let left = (7 - fileIndex(dest)) * 12.5;
  if (orientation === 'white') left = 87.5 - left;

  const verticalClass = color === orientation ? 'top' : 'bottom';

  const wrap = document.createElement('div');
  wrap.id = 'promotion-choice';
  wrap.className = verticalClass;
  // критично для мобилок: размеры, z-index и pointer-events
  Object.assign(wrap.style, {
    position: 'absolute',
    top: '0',
    bottom: '0',
    left: left + '%',
    width: '12.5%',
    zIndex: '999', // выше любых слоёв доски
    pointerEvents: 'auto',
    touchAction: 'manipulation', // избавляемся от задержки тапа
  });

  // клик по фону — отмена
  const cancelHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onCancel?.();
    destroy();
  };
  // используем pointerup + click для надёжности
  wrap.addEventListener('pointerup', cancelHandler);
  wrap.addEventListener('click', cancelHandler);

  pieces.forEach((role, i) => {
    // НЕ используем тег <square>, чтобы не поймать стили chessground
    const square = document.createElement('div');
    square.className = 'promo-square';

    const top = (color === orientation ? i : 7 - i) * 12.5;
    Object.assign(square.style, {
      position: 'absolute',
      left: '0',
      right: '0',
      top: top + '%',
      height: '12.5%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'auto',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
    });

    // перехватываем события до wrap
    const select = (e) => {
      e.preventDefault();
      e.stopPropagation();
      onFinish?.(role);
      destroy();
    };

    // pointer-события работают и с мышью, и с тачем
    square.addEventListener('pointerdown', (e) => e.stopPropagation());
    square.addEventListener('pointerup', select, { passive: false });
    square.addEventListener('click', select);

    // сам спрайт фигуры оставим как <piece>, но отключим его hit-test
    const pieceEl = document.createElement('piece');
    pieceEl.className = `${role} ${color}`;
    Object.assign(pieceEl.style, {
      width: '100%',
      height: '100%',
      pointerEvents: 'none', // кликаем по square, не по piece
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
    });

    square.appendChild(pieceEl);
    wrap.appendChild(square);
  });

  board.appendChild(wrap);

  function destroy() {
    wrap.removeEventListener('pointerup', cancelHandler);
    wrap.removeEventListener('click', cancelHandler);
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }

  return { el: wrap, destroy };
}

export function hidePromotionUI() {
  if (promotionHandle) {
    promotionHandle.destroy();
    promotionHandle = null;
  } else {
    // подчищаем, если что-то осталось
    getBoardRoot()?.querySelector('#promotion-choice')?.remove();
  }
}

// ===== bridge for promo.start hooks =====
export function showPromotionUI(ctrl, rolesOrFalse) {
  if (rolesOrFalse === false) {
    hidePromotionUI();
    return;
  }
  const state = ctrl.getState(); // { dest, ... }
  const dest = state.dest;

  // чей цвет у промо-фигур (по рангу клетки назначения)
  const movingColor = dest && dest[1] === '8' ? 'white' : 'black';
  const orientation = getOrientation();
  const root = getBoardRoot();

  // монтируем
  hidePromotionUI();
  promotionHandle = mountPromotionChoice({
    root,
    dest,
    pieces: rolesOrFalse,
    color: movingColor,
    orientation,
    onFinish: (role) => ctrl.finish(role),
    onCancel: () => ctrl.cancel(),
  });
}

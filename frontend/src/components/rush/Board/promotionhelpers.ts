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

  // left position (same formula as before)
  let left = (7 - fileIndex(dest)) * 12.5;
  if (orientation === 'white') left = 87.5 - left;

  const verticalClass = color === orientation ? 'top' : 'bottom';

  const wrap = document.createElement('div');
  wrap.id = 'promotion-choice';
  wrap.className = verticalClass;
  wrap.style.left = left + '%';

  // cancel on background click
  const cancelHandler = (e) => {
    e.stopPropagation();
    onCancel?.();
    destroy();
  };
  wrap.addEventListener('click', cancelHandler);
  wrap.oncontextmenu = () => false;

  pieces.forEach((role, i) => {
    const square = document.createElement('square');
    const top = (color === orientation ? i : 7 - i) * 12.5;
    square.setAttribute('style', 'top: ' + top + '%;');

    const pieceEl = document.createElement('piece');
    pieceEl.className = `${role} ${color}`;

    square.addEventListener('click', (e) => {
      e.stopPropagation();
      onFinish?.(role);
      destroy();
    });

    square.appendChild(pieceEl);
    wrap.appendChild(square);
  });

  board.appendChild(wrap);

  function destroy() {
    wrap.removeEventListener('click', cancelHandler);
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }

  return { el: wrap, destroy };
}

function hidePromotionUI() {
  if (promotionHandle) {
    promotionHandle.destroy();
    promotionHandle = null;
  } else {
    // подчищаем, если что-то осталось
    getBoardRoot()?.querySelector('#promotion-choice')?.remove();
  }
}

// ===== bridge for promo.start hooks =====
function showPromotionUI(ctrl, rolesOrFalse) {
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

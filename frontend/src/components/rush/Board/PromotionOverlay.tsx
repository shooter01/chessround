// PromotionOverlay.tsx
import React from 'react';

type Role = 'queen' | 'rook' | 'bishop' | 'knight';

interface Promo {
  orig: string;
  dest: string;
  callback: (orig: string, dest: string, role: Role) => void;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      square: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      piece: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

/**
 * Рендерит оверлей превращения точно в том виде,
 * как на Lichess: тег <square> с инлайновыми top/left,
 * и внутри <piece class="{role} white|black" />.
 */
const PromotionOverlay: React.FC<{
  promo: Promo;
  orientation: 'white' | 'black';
}> = ({ promo, orientation }) => {
  const roles: Role[] = ['queen', 'rook', 'bishop', 'knight'];
  const file = promo.dest[0];
  const rank = promo.dest[1];
  // top если до 8, иначе bottom
  const vert = rank === '8' ? 'top' : 'bottom';
  // индекс файла a→0, … h→7
  const fileIdx = 'abcdefgh'.indexOf(file);
  // проекции в процентах от ширины доски
  const leftPct = fileIdx * 12.5;

  return (
    <div id="promotion-choice" className={vert}>
      {roles.map((role, i) => (
        <square
          key={role}
          style={{
            top: `${i * 12.5}%`,
            left: `${leftPct}%`,
          }}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            promo.callback(promo.orig, promo.dest, role);
          }}
        >
          <piece className={`${role} ${orientation}`} />
        </square>
      ))}
    </div>
  );
};

export default PromotionOverlay;

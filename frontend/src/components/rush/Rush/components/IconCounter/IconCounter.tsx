import React from 'react';
import './icon-counter.css';
import { Icon } from '@iconify/react';
import checkIcon from '@iconify-icons/twemoji/white-heavy-check-mark';
import crossIcon from '@iconify-icons/twemoji/cross-mark';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

type CorrectPuzzle = {
  id: string;
  rating: number;
  result: boolean;
};

export function IconCounter({ items, columns = 5, size = 24 }: { items: CorrectPuzzle[] }) {
  return (
    <div
      className="stats-grid"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item, idx) => {
        const statusClass = item.result ? 'stats-item--success' : 'stats-item--error';
        const icon = item.result ? faCheck : faTimes;
        return (
          <div key={idx} className={`stats-item ${statusClass}`}>
            <span className="stats-item__icon-box" style={{ width: size, height: size }}>
              <FontAwesomeIcon icon={icon} />
            </span>
            <a
              href={`/puzzle/${item.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="stats-item__link"
            >
              {item.rating}
            </a>
          </div>
        );
      })}
    </div>
  );
}

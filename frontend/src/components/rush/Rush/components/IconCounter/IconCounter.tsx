import './icon-counter.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '@mui/material';
type CorrectPuzzle = {
  id: string;
  rating: number;
  result: boolean;
};

export function IconCounter({ items, columns = 5, size = 24 }: { items: CorrectPuzzle[] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <div
      className="stats-grid"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item, idx) => {
        const statusClass = item.result ? 'stats-item--success' : 'stats-item--error';
        const icon = item.result ? faCheck : faTimes;

        return (
          <a
            key={idx}
            href={`/puzzle/${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`stats-item ${statusClass} ${isDark ? 'dark' : 'light'}`}
          >
            <span className="stats-item__icon-box" style={{ width: size, height: size }}>
              <FontAwesomeIcon icon={icon} />
            </span>
            <span className="stats-item__link">{item.rating}</span>
          </a>
        );
      })}
    </div>
  );
}

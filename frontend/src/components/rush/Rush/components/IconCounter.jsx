// IconCounter.jsx
import './icon-counter.css';

export function IconCounter({ variant = 'success', count }) {
  // В зависимости от variant рендерим нужный путь
  const path =
    variant === 'success'
      ? <path d="M9 12l2 2 4-4" />
      : <path d="M7 7l10 10 M17 7l-10 10" />;

  return (
    <div className={`icon-counter icon-counter--${variant}`}>
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" />
        {path}
      </svg>
      <div className="count">{count}</div>
    </div>
  );
}

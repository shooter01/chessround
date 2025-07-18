import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import rocket from '@iconify-icons/twemoji/rocket';
import './CountdownOverlay.css';

interface CountdownOverlayProps {
  /** Вызывается сразу после того, как отобразится GO */
  onComplete?: () => void;
}

site.sound.load(`tick`, site.sound.url(`/sound/tick.mp3`));
site.sound.load(`start`, site.sound.url(`/sound/start.mp3`));

/**
 * Считает 3 → 2 → 1 → GO
 * иконка ракеты вместо “0”
 */
const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ onComplete }) => {
  // -1 = скрыть
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count < 0) return;
    if (count > 0) {
      site.sound.play(`tick`, parseFloat(localStorage.getItem('app-volume-factor') || '1'));
    } else {
      site.sound.play(`start`, parseFloat(localStorage.getItem('app-volume-factor') || '1'));
    }

    const timer = window.setTimeout(() => {
      if (count > 0) {
        setCount(count - 1);
      } else {
        // count === 0
        onComplete?.();
        // скрываем оверлей после GO
        setCount(-1);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [count, onComplete]);

  if (count < 0) return null;

  return (
    <div className="countdown-overlay">
      {count > 0 ? (
        <div className="countdown-number">{count}</div>
      ) : (
        <>
          <Icon icon={rocket} className="countdown-go-icon" />
          <div className="countdown-number"> GO</div>
        </>
      )}
    </div>
  );
};

export default CountdownOverlay;

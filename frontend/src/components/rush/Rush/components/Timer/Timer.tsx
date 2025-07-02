// Timer.tsx
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Icon } from '@iconify/react';
import stopwatch from '@iconify-icons/twemoji/stopwatch';
import Countdown, { CountdownRendererFn } from 'react-countdown';
import './timer.css';

interface TimerProps {
  /** В миллисекундах */
  durationMs: number;
  onStart?: () => void;
  onComplete?: () => void;
}

// Фабрика рендера mm:ss
const renderer: CountdownRendererFn = ({ minutes, seconds, completed }) => {
  if (completed) return <span>00:00</span>;
  return (
    <span>
      {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
    </span>
  );
};

const Timer = forwardRef<any, TimerProps>(({ durationMs, onStart, onComplete }, ref) => {
  // 1) Однократно (при маунте) и при каждом change durationMs
  const [targetDate, setTargetDate] = useState(() => Date.now() + durationMs);

  useEffect(() => {
    setTargetDate(Date.now() + durationMs);
  }, [durationMs]);

  // Если вам нужен доступ к методам Countdown через ref
  useImperativeHandle(ref, () => countdownRef.current);

  const countdownRef = React.useRef<any>(null);

  return (
    <div className="timer">
      <Icon icon={stopwatch} className="timer__icon" />
      <div className="timer__text">
        <Countdown
          ref={countdownRef}
          date={targetDate}
          renderer={renderer}
          onStart={() => {
            onStart?.();
          }}
          onComplete={() => {
            onComplete?.();
          }}
        />
      </div>
    </div>
  );
});

// 2) Обёртка React.memo — перерендерит лишь при изменении durationMs / onStart / onComplete
export default React.memo(Timer);

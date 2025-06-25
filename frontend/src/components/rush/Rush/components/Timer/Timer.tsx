import React, { useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';
import stopwatch from '@iconify-icons/twemoji/stopwatch';
import Countdown, { CountdownRendererFn } from 'react-countdown';
import './timer.css';

interface TimerProps {
  /** В миллисекундах, сколько должно идти обратный отсчёт */
  durationMs: number;
  /** Колбэк, вызываемый один раз при старте отсчёта */
  onStart?: () => void;
  /** Колбэк, вызываемый при завершении */
  onComplete?: () => void;
}

/** Простая вёрстка цифр М:СС */
const renderer: CountdownRendererFn = ({ minutes, seconds, completed }) => {
  if (completed) return <span>00:00</span>;
  return (
    <span>
      {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
    </span>
  );
};

export default function Timer({ countdownRef, durationMs, onStart, onComplete }: TimerProps) {
  // ref на инстанс Countdown

  return (
    <div className="timer">
      <Icon icon={stopwatch} className="timer__icon" />
      <div className="timer__text">
        <Countdown
          ref={countdownRef}
          date={Date.now() + durationMs}
          renderer={renderer}
          onStart={() => {
            console.log('Countdown started');
            onStart?.();
          }}
          onComplete={() => {
            console.log('Countdown completed');
            onComplete?.();
          }}
        />
      </div>
    </div>
  );
}

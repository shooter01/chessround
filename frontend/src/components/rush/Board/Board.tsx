// Board.tsx
import React, { useEffect, useRef, useState } from 'react';
import { run, Color } from '../chessground/main';
import './assets/chessground.css';
import './assets/promotion.css';

import './assets/chessground.css'; // Импортируем стили
import './assets/theme.css'; // Импортируем стили
import './assets/3d.css'; // Импортируем стили
import './assets/examples.css'; // Импортируем стили
import './assets/promotion.css'; // Импортируем стили

const Board: React.FC = () => {
  const [color, setColor] = useState<Color>('white');
  const runnerRef = useRef<{ setColor: (c: Color) => void }>();

  // 1) при монтировании создаём доску
  useEffect(() => {
    const el = document.getElementById('chessground-examples');
    if (el) {
      runnerRef.current = run(el, color);
    }
  }, []); // один раз

  // 2) автоматически меняем цвет оверлея при изменении state
  useEffect(() => {
    runnerRef.current?.setColor(color);
  }, [color]);

  // демо: переключаем цвет через 2 секунды
  useEffect(() => {
    const t = setTimeout(() => setColor('black'), 2000);
    return () => clearTimeout(t);
  }, []);

  return <div id="chessground-examples" />;
};

export default Board;

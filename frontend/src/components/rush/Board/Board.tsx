// Board.tsx
import React, { useEffect, useRef, useState } from 'react';
import { run, Color } from '../chessground/main';
import './assets/chessground.css';
import './assets/promotion.css';
import './assets/pieces.css';
import './assets/board.css';
import './assets/chessground.css'; // Импортируем стили
import './assets/theme.css'; // Импортируем стили
import './assets/3d.css'; // Импортируем стили
import './assets/examples.css'; // Импортируем стили
import './assets/promotion.css'; // Импортируем стили
import { Chess, SQUARES } from 'chess.js';

const Board: React.FC = ({}) => {
  // const runnerRef = useRef<ReturnType<typeof run>>();
  // run(document.getElementById('chessground-examples'), color);
  // // 1) при монтировании создаём доску
  useEffect(() => {
    const el = document.getElementById('chessground-examples');
    if (el) {
      run(el);
      // сразу установить видимость прево­щения, если нужно
    }
  }, []);

  return <div id="chessground-examples" />;
};

export default Board;

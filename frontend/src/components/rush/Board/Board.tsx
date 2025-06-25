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
import { Chess, SQUARES } from 'chess.js';

interface BoardProps {
  color: Color;
  promoVisible: boolean;
}

const Board: React.FC<BoardProps> = ({ color, promoVisible }) => {
  // const runnerRef = useRef<ReturnType<typeof run>>();
  // run(document.getElementById('chessground-examples'), color);
  // // 1) при монтировании создаём доску
  useEffect(() => {
    const el = document.getElementById('chessground-examples');
    if (el) {
      run(el, color);
      // сразу установить видимость прево­щения, если нужно
      // runnerRef.current.setShowPromotion(promoVisible);
    }
  }, []);

  // // 2) при изменении цвета вызываем setColor()
  // useEffect(() => {
  //   runnerRef.current?.setColor(color);
  // }, [color]);

  // // 3) при изменении флага promoVisible вызываем setShowPromotion()
  // useEffect(() => {
  //   runnerRef.current?.setShowPromotion(promoVisible);
  // }, [promoVisible]);

  return <div id="chessground-examples" />;
};

export default Board;

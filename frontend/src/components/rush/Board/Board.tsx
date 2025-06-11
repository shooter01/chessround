import React, { useEffect } from 'react';
import { run } from '../chessground/main';
import './assets/chessground.css'; // Импортируем стили
import './assets/theme.css'; // Импортируем стили
import './assets/3d.css'; // Импортируем стили
import './assets/examples.css'; // Импортируем стили

const Board: React.FC = () => {
  useEffect(() => {
    run(document.getElementById('chessground-examples'));
  }, []);
  return <div id="chessground-examples"></div>;
};

export default Board;

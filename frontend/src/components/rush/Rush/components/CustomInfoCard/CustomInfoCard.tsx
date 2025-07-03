// CustomInfoCard.jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './CustomInfoCard.css';

/**
 * Универсальный бейдж/баннер с четырьмя состояниями:
 *  - "white": ход белых
 *  - "black": ход чёрных
 *  - "correct": корректный ход (зелёный баннер с текстом)
 *  - "incorrect": некорректный ход (красный баннер с иконкой)
 *
 * Для переводов используются ключи:
 *  badge.whiteToMove, badge.blackToMove, badge.correct
 */
export default function CustomInfoCard({ state = 'white' }) {
  const { t } = useTranslation();
  const isMove = state === 'white' || state === 'black';
  const isResult = state === 'correct' || state === 'incorrect';

  // Определяем отображаемый текст через i18n
  let displayText = '';
  if (state === 'white') displayText = t('badge.whiteToMove');
  if (state === 'black') displayText = t('badge.blackToMove');
  if (state === 'correct') displayText = t('badge.correct');
  // для incorrect текст не отображается

  const badge = (
    <div className={`custom-card ${state}`}>
      <div className="custom-card-content">
        {state === 'white' && <div className="badge-square white" />}
        {state === 'black' && <div className="badge-square black" />}
        {state === 'correct' && <Check className="badge-icon correct" />}
        {state === 'incorrect' && <X className="badge-icon incorrect" />}
        {(isMove || state === 'correct') && (
          <span className={`badge-text ${state}`}>{displayText}</span>
        )}
      </div>
    </div>
  );

  // Для результата рендерим через портал в body
  return badge;
}

// CustomInfoCard.jsx
import React from 'react';
import { ChevronRight, Check, X } from 'lucide-react';
import './CustomInfoCard.css';

/**
 * Компонент карточки с чистыми CSS-стилями
 * props:
 * - icon: React-компонент иконки
 * - title: основной текст
 * - subtitle: вспомогательный текст
 * - onAction: callback при клике на кнопку (только для default)
 * - status: 'default' | 'success' | 'error'
 */
export default function CustomInfoCard({ state = 'white', text = '' }) {
  const isMove = state === 'white' || state === 'black';
  const isResult = state === 'correct' || state === 'incorrect';
  return (
    <div className={`custom-card ${state}`}>
      <div className="custom-card-content">
        {state === 'white' && <div className="badge-square white" />}
        {state === 'black' && <div className="badge-square black" />}
        {state === 'correct' && <Check size={20} className="badge-icon correct" />}
        {state === 'incorrect' && <X size={20} className="badge-icon incorrect" />}
        {(isMove || state === 'correct') && <span className={`badge-text ${state}`}>{text}</span>}
      </div>
    </div>
  );
}

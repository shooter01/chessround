import React from 'react';
import './ResultCard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faSyncAlt, faFire } from '@fortawesome/free-solid-svg-icons';

const ResultCardModern = ({
  mood = 'Good!',
  result = 0,
  today = 0,
  allTime = 0,
  longestStreak = 0,
  onPlayAgain,
  onAnotherMode,
}) => {
  return (
    <div className="rcard-modern">
      <div className="rcard-modern__header">
        <h2 className="rcard-modern__mood">{mood}</h2>
      </div>
      <div className="rcard-modern__body">
        <p className="rcard-modern__label">Your result</p>
        <p className="rcard-modern__result">{result}</p>

        <div className="rcard-modern__divider" />

        <div className="rcard-modern__stats">
          <div className="rcard-modern__stat">
            <FontAwesomeIcon icon={faCalendarAlt} className="rcard-modern__stat-icon" />
            <span className="rcard-modern__stat-value">{today}</span>
            <span className="rcard-modern__stat-label">TODAY</span>
          </div>
          <div className="rcard-modern__stat">
            <FontAwesomeIcon icon={faSyncAlt} className="rcard-modern__stat-icon" />
            <span className="rcard-modern__stat-value">{allTime}</span>
            <span className="rcard-modern__stat-label">ALL TIME</span>
          </div>
        </div>

        <div className="rcard-modern__divider" />

        {/* Таблица для longest streak */}
        <div className="rcard-modern__streak-wrapper">
          <table className="rcard-modern__streak-table">
            <tbody>
              <tr>
                <td className="rcard-modern__streak-icon-cell">
                  <FontAwesomeIcon icon={faFire} />
                </td>
                <td className="rcard-modern__streak-label-cell">Longest streak</td>
                <td className="rcard-modern__streak-value-cell">{longestStreak}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rcard-modern__divider" />

        <button className="rcard-modern__btn rcard-modern__btn--primary" onClick={onPlayAgain}>
          Play Again
        </button>
        <button className="rcard-modern__btn rcard-modern__btn--secondary" onClick={onAnotherMode}>
          Another mode
        </button>
      </div>
    </div>
  );
};

export default ResultCardModern;

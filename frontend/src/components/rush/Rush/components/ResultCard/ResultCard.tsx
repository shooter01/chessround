import React from 'react';
import './ResultCard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faSyncAlt, faFire } from '@fortawesome/free-solid-svg-icons';

interface ResultCardModernProps {
  result: number;
  today: number;
  allTime: number;
  longestStreak: number;
  onPlayAgain: () => void;
  onAnotherMode: () => void;
}

const ResultCardModern: React.FC<ResultCardModernProps> = ({
  result,
  today,
  allTime,
  longestStreak,
  onPlayAgain,
  onAnotherMode,
}) => {
  // тема: набор CSS‑переменных в зависимости от результата
  const themeMap = [
    {
      test: () => result >= allTime,
      vars: {
        '--primary': '#ffd700', // gold
        '--primary-dark': '#e6c200',
        '--btn-bg': '#ffd700',
        '--btn-hover': '#e6c200',
      },
      mood: 'Legendary!',
    },
    {
      test: () => result >= today + 2,
      vars: {
        '--primary': '#4caf50', // green
        '--primary-dark': '#3e8e41',
        '--btn-bg': '#4caf50',
        '--btn-hover': '#3e8e41',
      },
      mood: 'Fantastic!',
    },
    {
      test: () => result >= today,
      vars: {
        '--primary': '#2196f3', // blue
        '--primary-dark': '#1976d2',
        '--btn-bg': '#2196f3',
        '--btn-hover': '#1976d2',
      },
      mood: 'Great!',
    },
    {
      test: () => result > 0,
      vars: {
        '--primary': '#ff9800', // orange
        '--primary-dark': '#e68900',
        '--btn-bg': '#ff9800',
        '--btn-hover': '#e68900',
      },
      mood: 'Keep going!',
    },
    {
      test: () => true,
      vars: {
        '--primary': '#9e9e9e', // grey
        '--primary-dark': '#7e7e7e',
        '--btn-bg': '#9e9e9e',
        '--btn-hover': '#7e7e7e',
      },
      mood: "Let's try!",
    },
  ];

  const theme = themeMap.find((t) => t.test())!;
  const cssVars = Object.fromEntries(
    Object.entries(theme.vars).map(([k, v]) => [k, v]),
  ) as React.CSSProperties;
  const moodText = theme.mood;

  return (
    <div className="rcard-modern" style={cssVars}>
      <div className="rcard-modern__header">
        <h2 className="rcard-modern__mood">{moodText}</h2>
      </div>
      <div className="rcard-modern__body">
        <p className="rcard-modern__label">Your result</p>
        <p className="rcard-modern__result">{result}</p>

        <div className="rcard-modern__divider" />

        <div className="rcard-modern__stats">
          <div className="rcard-modern__stat">
            <FontAwesomeIcon icon={faCalendarAlt} className="rcard-modern__stat-icon" />
            <span className="rcard-modern__stat-value">{result >= today ? result : today}</span>
            <span className="rcard-modern__stat-label">TODAY</span>
          </div>
          <div className="rcard-modern__stat">
            <FontAwesomeIcon icon={faSyncAlt} className="rcard-modern__stat-icon" />
            <span className="rcard-modern__stat-value">{allTime}</span>
            <span className="rcard-modern__stat-label">ALL TIME</span>
          </div>
        </div>

        <div className="rcard-modern__divider" />

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

        <button
          className="rcard-modern__btn rcard-modern__btn--primary"
          onClick={onPlayAgain}
          style={{ backgroundColor: 'var(--btn-bg)' }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--btn-hover)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--btn-bg)')}
        >
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

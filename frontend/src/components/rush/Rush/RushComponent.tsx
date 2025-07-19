import React, { useRef, useState, useEffect } from 'react';
import { Container, Grid, Box } from '@mui/material';

// import { puzzles } from './mocks/mock.ts';
import Countdown from 'react-countdown';
import axios from 'axios';

import { useNavigate } from 'react-router-dom';

import Board from '../Board/Board';
import CountdownOverlay from './components/StartCountDown/CountdownOverlay.tsx';
import './styles.css';

// import puzzles from './const';
import CurrentPuzzle from './current/current';
import ResultCard from './components/ResultCard/ResultCard.jsx';
import RushDefaultState from './RightPanel/DefaultState.tsx';
import RushStartedState from './RightPanel/RushStartedState.tsx';
let canChangePuzzle = true;
import { useAuth } from '../../../contexts/AuthContext.tsx';
import { useRecords } from '../hooks/useRecords';
import { API_BASE } from '@api/api';

declare global {
  interface Window {
    addCorrectPuzzle?: (puzzle: CurrentPuzzle, result: boolean) => Promise<void>;
  }
}

if (!window.site) window.site = {} as Site;
if (!window.site.load)
  window.site.load = new Promise<void>(function (resolve) {
    document.addEventListener('DOMContentLoaded', function () {
      resolve();
    });
  });

window.puzzlesCounter = -1;
// это потом полетит на бек для проверки
window.currentPuzzlesMoves = [];
window.currentPuzzle;

export default function PuzzleRush() {
  const navigate = useNavigate();
  const [puzzles, setPuzzles] = useState([]);
  const { user, token } = useAuth(); // предполагается, что здесь есть ваш JWT
  const [sessionId, setSessionId] = useState<string | null>(null); // <— добавили

  const [pov, setPov] = useState<'white' | 'black'>('white');
  const [showResults, setShowResults] = useState<boolean>(false);

  const countdownRef = useRef<Countdown>(null);
  const [showCountdown, setShowCountdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [rushModeCounter, setRushModeCounter] = useState(300000);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [theme, setTheme] = useState('');
  const raw = localStorage.getItem('rushModeKey') || '5';
  const modeStorage = raw === 'survival' ? 'survival' : `${raw}m`;
  const [mode, setMode] = useState(modeStorage || '5m'); // <— добавили
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  // const [bestToday, setBestToday] = useState<number>(0);
  // const [bestAllTime, setBestAllTime] = useState<number>(0);
  const [promoVisible, setPromoVisible] = useState(false);
  window.handleStart = async () => {
    try {
      setShowResults(false);
      setIsFinished(false);
      setCorrectPuzzles([]);
      window.currentPuzzlesMoves = [];
      setShowCountdown(true);
      setIsStarted(true);
      setCurrentStreak(0);
      setLongestStreak(0);
      countdownRef.current?.stop();

      setTimeout(() => countdownRef.current?.start(), 100);

      setLoading(true);

      // достаём режим из localStorage (или дефолт)
      const raw = localStorage.getItem('rushModeKey') || '5';
      const mode = raw === 'survival' ? 'survival' : `${raw}m`;
      const { data } = await axios.get<{
        puzzles: any[];
        session_id: string;
      }>(`${API_BASE}/puzzles/get`, {
        params: { mode },
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });
      setLoading(false);

      // Сохраняем паззлы и session_id
      setPuzzles(data.puzzles.puzzles);
      setSessionId(data.session_id); // <— сохраняем

      // Старт первого паззла
      // setTimeout(() => window.setNextPuzzle(), 2000);
    } catch (err) {
      setLoading(false);
      console.error('Не удалось загрузить паззлы:', err);
      setError('Ошибка при загрузке паззлов');
    }
  };
  window.setCorrect = async (isCorrect: boolean) => {
    // 1) Локальная анимация и обновление серии
    const oldPov = pov;
    setPov(isCorrect ? 'correct' : 'incorrect');
    setTimeout(() => setPov(oldPov), 1700);

    setCurrentStreak((prev) => {
      const next = isCorrect ? prev + 1 : 0;
      if (next > longestStreak) setLongestStreak(next);
      return next;
    });

    // 2) Локальный расчёт очков
    // Например: +1 за правильный, ничего за неправильный
    setCurrentPoints((prevPoints) => {
      const delta = isCorrect ? 1 : 0;
      return prevPoints + delta;
    });

    // 3) Параллельно — попытка отправить на сервер
    if (sessionId) {
      try {
        const puzzle = puzzles[window.puzzlesCounter];
        const result = await axios.post(
          `${API_BASE}/puzzles/solve`,
          {
            session_id: sessionId,
            fen: puzzle.fen,
            moves: window.currentPuzzlesMoves.join(' '),
            result: isCorrect ? 'win' : 'lose',
          },
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
          },
        );
        // если бэкенд вернул актуальные очки (можно синхронизировать)
        if (result.data.current_points != null) {
          setCurrentPoints(result.data.current_points);
        }
      } catch (e) {
        console.error('Не удалось отправить результат паззла:', e);
        // ничего не делаем — UI уже обновлён
      }
    }
  };

  window.setNextPuzzle = async () => {
    window.cg.setAutoShapes([]);

    window.puzzlesCounter++;
    console.log(puzzles[puzzlesCounter]);
    window.currentPuzzlesMoves = [];

    window.currentPuzzle = new CurrentPuzzle(puzzlesCounter, puzzles[puzzlesCounter]);
    window.currentPuzzle.startFen = puzzles[puzzlesCounter].fen;
    window.chess.load(puzzles[puzzlesCounter].fen);
    setPov(window.currentPuzzle.pov);
    if (!canChangePuzzle) {
      return;
    }
    window.setPosition();

    setTimeout(() => {
      if (window.puzzlesCounter !== 0) window.playComputerMove();
    }, 300);
  };

  const [correctPuzzles, setCorrectPuzzles] = useState<CorrectPuzzle[]>([]);
  useEffect(() => {
    // Расширяем Window интерфейс, чтобы TS не ругался:

    window.addCorrectPuzzle = async (current: CurrentPuzzle, result: boolean) => {
      setCorrectPuzzles((prev) => [
        ...prev,
        {
          id: current.puzzle.puzzle_id,
          rating: current.puzzle.rating,
          result,
        },
      ]);
    };
  }, []);
  useEffect(() => {
    // Расширяем Window интерфейс, чтобы TS не ругался:

    if (puzzles.length > 0 && isStarted) {
      window.setNextPuzzle();
    }
  }, [puzzles, isStarted]);
  useEffect(() => {
    // Count how many puzzles have result === false
    const falseCount = correctPuzzles.filter((p) => p.result === false).length;

    if (falseCount >= 3) {
      canChangePuzzle = false;
      setIsStarted(false);
      setIsFinished(true);
      setTimeout(() => {
        setShowResults(true);
      }, 300);
    }
  }, [correctPuzzles, setShowResults, setIsStarted]);
  const { bestToday, bestAllTime } = useRecords(mode, token);

  return (
    <Container maxWidth="lg">
      <Grid
        container
        spacing={2}
        sx={{
          width: '100%',
          maxWidth: 1400,
          justifyContent: 'center',
          mx: 'auto', // центрируем весь грид
        }}
      >
        {/* Левая часть: доска и оверлеи */}
        <Grid
          item
          xs={12}
          md={8}
          sx={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Board promoVisible={promoVisible} />
          {showCountdown && (
            <CountdownOverlay
              onComplete={() => {
                setShowCountdown(false);
                window.playComputerMove();
              }}
            />
          )}
          {showResults && (
            <div className="rcard-overlay">
              <ResultCard
                result={currentPoints}
                today={bestToday}
                allTime={bestAllTime}
                longestStreak={longestStreak}
                onPlayAgain={() => window.handleStart()}
                onAnotherMode={() => navigate('/')}
              />
            </div>
          )}
        </Grid>

        {/* Правая панель */}
        <Grid
          item
          xs={12}
          md="4" // теперь займёт только ширину контента
          sx={{
            // чтобы контент в центре не растягивал грид
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: '100%', // растягиваем Box на всю ширину колонки
              maxWidth: 360, // но не больше 300px (подберите свой лимит)
              mx: 'auto',
            }}
          >
            {!isStarted && !isFinished ? (
              <RushDefaultState
                isStarted={isStarted}
                loading={loading}
                token={token}
                bestToday={bestToday}
                bestAllTime={bestAllTime}
                correctPuzzles={correctPuzzles}
                countdownRef={countdownRef}
                setRushModeCounter={setRushModeCounter}
                setMode={setMode}
                setShowResults={setShowResults}
                setIsStarted={setIsStarted}
                showCountdown={showCountdown}
              />
            ) : (
              <RushStartedState
                isStarted={isStarted}
                loading={loading}
                pov={pov}
                correctPuzzles={correctPuzzles}
                countdownRef={countdownRef}
                rushModeCounter={rushModeCounter}
                setShowResults={setShowResults}
                setIsStarted={setIsStarted}
                showCountdown={showCountdown}
              />
            )}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

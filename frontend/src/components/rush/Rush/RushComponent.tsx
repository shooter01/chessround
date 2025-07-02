import React, { useRef, useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Box,
  Stack,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Avatar,
  useTheme,
} from '@mui/material';
import { Chessground } from 'chessground';

import { createTimes, puzzles, mockPlayers } from './mocks/mock.ts';
import Countdown from 'react-countdown';
import { useTranslation } from 'react-i18next';

import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ExtensionIcon from '@mui/icons-material/Extension';
import WbSunnyIcon from '@mui/icons-material/CalendarToday';
import SyncIcon from '@mui/icons-material/Autorenew';
import { useNavigate } from 'react-router-dom';

import Board from '../Board/Board';
import CountdownOverlay from './components/StartCountDown/CountdownOverlay.tsx';
import { toColor, toDests } from './util.ts';
import './styles.css';

// import puzzles from './const';
import CurrentPuzzle from './current/current';
import { Chess, Color } from 'chess.js';
import ResultCard from './components/ResultCard/ResultCard.jsx';
import RushDefaultState from './RightPanel/DefaultState.tsx';
import RushStartedState from './RightPanel/RushStartedState.tsx';
import { lastMoveDrop } from '../chessground/units/zh.ts';
let canChangePuzzle = true;

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
window.currentPuzzle;

export default function PuzzleRush() {
  const navigate = useNavigate();

  const [pov, setPov] = useState<'white' | 'black'>('white');
  const [showResults, setShowResults] = useState<boolean>(false);

  const countdownRef = useRef<Countdown>(null);
  const [showCountdown, setShowCountdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [rushModeCounter, setRushModeCounter] = useState(300000);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Параметры запроса – можно взять из селектора, URL, контекста…
  const level = 3;
  // const theme = 'fork';
  const limit = 5;

  const [promoVisible, setPromoVisible] = useState(false);
  window.handleStart = async () => {
    canChangePuzzle = true;
    setShowResults(false);
    setCorrectPuzzles([]);
    setShowCountdown(true);
    setIsStarted(true);
    countdownRef.current?.stop();
    setTimeout(() => {
      countdownRef.current?.start();
    }, 100);
    window.puzzlesCounter = -1;

    window.setNextPuzzle();
  };

  window.setNextPuzzle = async () => {
    window.cg.setAutoShapes([]);

    window.puzzlesCounter++;
    window.currentPuzzle = new CurrentPuzzle(puzzlesCounter, puzzles[puzzlesCounter]);
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
          id: current.puzzle.id,
          rating: current.puzzle.rating,
          result,
        },
      ]);
    };
  }, []);
  useEffect(() => {
    // Count how many puzzles have result === false
    const falseCount = correctPuzzles.filter((p) => p.result === false).length;

    if (falseCount >= 3) {
      canChangePuzzle = false;
      setIsStarted(false);
      setTimeout(() => {
        setShowResults(true);
      }, 300);
    }
  }, [correctPuzzles, setShowResults, setIsStarted]);

  return (
    <Container
      maxWidth="lg"
      // sx={{
      //   display: 'flex',
      //   justifyContent: 'center',
      //   alignItems: 'center',
      // }}
    >
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
                mood="Good!"
                result={0}
                today={1}
                allTime={23}
                longestStreak={0}
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
            {!isStarted ? (
              <RushDefaultState
                isStarted={isStarted}
                loading={loading}
                correctPuzzles={correctPuzzles}
                countdownRef={countdownRef}
                setRushModeCounter={setRushModeCounter}
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

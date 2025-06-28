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

import { times, puzzles, mockPlayers } from './mocks/mock.ts';
import Countdown from 'react-countdown';

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

  const [loading, setLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Параметры запроса – можно взять из селектора, URL, контекста…
  const level = 3;
  // const theme = 'fork';
  const limit = 5;

  const [promoVisible, setPromoVisible] = useState(false);

  window.handleStart = async () => {
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
    window.puzzlesCounter++;
    window.currentPuzzle = new CurrentPuzzle(puzzlesCounter, puzzles[puzzlesCounter]);
    window.chess.load(puzzles[puzzlesCounter].fen);

    window.cg.set({
      viewOnly: false,
      fen: window.chess.fen(),
      turnColor: toColor(window.chess),
    });

    setTimeout(() => {
      window.chess.move(currentPuzzle.expectedMove());
      window.cg.set({
        fen: window.chess.fen(),
        turnColor: toColor(window.chess),
        movable: {
          free: false,
          color: toColor(window.chess),
          dests: toDests(window.chess),
        },
      });
      currentPuzzle.moveIndex++;
    }, 1000);
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

  const [showResults, setShowResults] = useState<boolean>(false);

  const countdownRef = useRef<Countdown>(null);
  const [showCountdown, setShowCountdown] = useState(false);

  return (
    <Container
      maxWidth="lg"
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Grid container spacing={2} sx={{ maxWidth: '1400px' }}>
        {/* Левая часть: доска и оверлеи */}
        <Grid
          item
          xs={12}
          lg={8}
          sx={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Board promoVisible={promoVisible} />
          {showCountdown && <CountdownOverlay onComplete={() => setShowCountdown(false)} />}
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
          md="auto" // теперь займёт только ширину контента
          sx={{
            // чтобы контент в центре не растягивал грид
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: { xs: '100%', sm: 360 },
              bgcolor: 'background.paper',
              boxShadow: (theme) => theme.shadows[6],
              borderRadius: 2,
              p: 2,
              transition: 'transform .2s',
              '&:hover': {
                // transform: 'translateY(-4px)',
                // boxShadow: (theme) => theme.shadows[12],
              },
            }}
          >
            <RushDefaultState
              isStarted={isStarted}
              loading={loading}
              correctPuzzles={correctPuzzles}
              countdownRef={countdownRef}
              setShowResults={setShowResults}
              setIsStarted={setIsStarted}
              showCountdown={showCountdown}
            />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

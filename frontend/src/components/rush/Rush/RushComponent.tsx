import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Stack,
  Grid,
  Avatar,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
  SelectChangeEvent,
  Button,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { IconCounter } from './components/IconCounter/IconCounter.tsx';
import { times, puzzles } from './mocks/mock.ts';
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
import Timer from './components/Timer/Timer.jsx';
import ResultCard from './components/ResultCard/ResultCard.jsx';

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
  const [mainTab, setMainTab] = useState<'play' | 'leaderboard'>('play');
  const [boardTab, setBoardTab] = useState<'global' | 'friends' | 'personal'>('global');
  const [position, setPosition] = useState<string>(
    'rnbqkb1r/pp1ppppp/5n2/8/3N1B2/8/PPP1PPPP/RN1QKB1R b KQkq - 0 4',
  );

  const [range, setRange] = useState<'daily' | 'weekly' | 'all'>('all');

  const itemSx = (active: boolean) => ({
    flex: 1,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'transform .2s, filter .2s',
    transform: active ? 'scale(1.05)' : 'scale(1)',
    filter: active ? 'drop-shadow(0 0 12px rgba(0,0,0,0.3))' : 'none',
    '&:hover': {
      filter: 'drop-shadow(0 0 16px rgba(0,0,0,0.4))',
      transform: 'scale(1.1)',
    },
  });

  const handleMainTab = (_: any, v: string) => setMainTab(v as any);
  const handleBoardTab = (_: any, v: string) => setBoardTab(v as any);
  const handleRange = (e: SelectChangeEvent) => setRange(e.target.value as any);

  const [loading, setLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Параметры запроса – можно взять из селектора, URL, контекста…
  const level = 3;
  const theme = 'fork';
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

  const [color, setColor] = useState<Color>('black');
  const [showResults, setShowResults] = useState<boolean>(false);

  const countdownRef = useRef<Countdown>(null);
  const [showCountdown, setShowCountdown] = useState(false);

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <Grid container spacing={2} sx={{ maxWidth: '1400px' }}>
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
                onPlayAgain={() => {
                  handleStart();
                }}
                onAnotherMode={() => {
                  navigate('/');
                }}
              />
            </div>
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              bgcolor: '#f5f5f5',
              color: '#333',
              borderRadius: 2,
              maxWidth: 600,
              mx: 'auto',
              p: 2,
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {/* BACK BUTTON + TITLE */}
            <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
              <IconButton size="small" onClick={() => navigate('/')}>
                <ArrowBackIosNewIcon />
              </IconButton>
              <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Puzzle Rush
                </Typography>
              </Box>
              <Box sx={{ width: 40 }} />
            </Stack>

            {/* Puzzle icon */}
            <Box sx={{ textAlign: 'center', my: 1 }}>
              <ExtensionIcon sx={{ fontSize: 48, color: '#fb8c00' }} />
            </Box>

            {/* Top stats */}
            <Stack direction="row" justifyContent="space-around" mb={1}>
              <Stack alignItems="center">
                <WbSunnyIcon />
                <Typography variant="h6">--</Typography>
                <Typography variant="caption" sx={{ textTransform: 'uppercase' }}>
                  Best Today
                </Typography>
              </Stack>
              <Stack alignItems="center">
                <SyncIcon />
                <Typography variant="h6">--</Typography>
                <Typography variant="caption" sx={{ textTransform: 'uppercase' }}>
                  Top Score
                </Typography>
              </Stack>
            </Stack>
            {isStarted ? (
              <>
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  {isStarted && !showCountdown ? (
                    <Timer
                      countdownRef={countdownRef}
                      durationMs={200000} // 10 секунд
                      onStart={() => console.log('🔔 Timer has started')}
                      onComplete={() => {
                        console.log('🏁 Timer has finished');
                        setShowResults(true);
                        setIsStarted(false);
                      }}
                    />
                  ) : null}
                </Box>

                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <IconCounter items={correctPuzzles} columns={8} />
                </Box>
              </>
            ) : (
              <>
                {/* Main tabs */}
                <Tabs
                  value={mainTab}
                  onChange={handleMainTab}
                  textColor="primary"
                  indicatorColor="primary"
                  sx={{ mb: 1 }}
                >
                  <Tab label="Play" value="play" />
                  <Tab label="Leaderboard" value="leaderboard" />
                </Tabs>

                {mainTab === 'play' && (
                  <>
                    {/* Time icons row */}
                    <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                      {times.map((t) => {
                        // const active = selTime === t.key;
                        const active = false;
                        return (
                          <Box key={t.key} onClick={() => navigate(t.path)} sx={itemSx(active)}>
                            <Icon icon={t.icon} width={80} height={80} />
                            <Typography sx={{ mt: 1, fontSize: 16, fontWeight: 700 }}>
                              {t.label}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Stack>

                    <Box sx={{ textAlign: 'center', mt: 4 }}>
                      <Button
                        variant="contained"
                        size="large"
                        color="primary"
                        onClick={handleStart}
                        disabled={loading}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Start Puzzle Rush'}
                      </Button>
                    </Box>
                  </>
                )}

                {mainTab === 'leaderboard' && (
                  <>
                    {/* Sub-tabs */}
                    <Tabs
                      value={boardTab}
                      onChange={handleBoardTab}
                      textColor="primary"
                      indicatorColor="primary"
                      sx={{ mt: 1 }}
                    >
                      <Tab label="Global" value="global" />
                      <Tab label="Friends" value="friends" />
                      <Tab label="Personal" value="personal" />
                    </Tabs>

                    {/* Period select */}
                    <FormControl size="small" sx={{ mt: 1, mb: 1, minWidth: 120 }}>
                      <InputLabel>All</InputLabel>
                      <Select value={range} label="All" onChange={handleRange}>
                        <MenuItem value="daily">Daily</MenuItem>
                        <MenuItem value="weekly">Weekly</MenuItem>
                        <MenuItem value="all">All</MenuItem>
                      </Select>
                    </FormControl>

                    {/* Leaderboard list */}
                    <Paper
                      variant="outlined"
                      sx={{
                        bgcolor: '#fff',
                        borderColor: '#ddd',
                        borderRadius: 2,
                        maxHeight: 350,
                        overflowY: 'auto',
                      }}
                    >
                      {mockPlayers
                        .filter((_, i) => {
                          if (boardTab === 'friends') return i % 2 === 0;
                          if (boardTab === 'personal') return i < 5;
                          return true;
                        })
                        .map((p) => (
                          <Stack
                            key={p.rank}
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            px={2}
                            py={1}
                            sx={{
                              '&:nth-of-type(odd)': { bgcolor: '#fafafa' },
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography sx={{ width: 24 }}>#{p.rank}</Typography>
                              <Avatar
                                src={p.avatarUrl}
                                sx={{ width: 32, height: 32, bgcolor: '#ccc' }}
                              />
                              {p.title && (
                                <Box
                                  sx={{
                                    fontSize: 12,
                                    px: 0.5,
                                    py: 0.2,
                                    border: '1px solid #aaa',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {p.title}
                                </Box>
                              )}
                              <Typography sx={{ color: '#1976d2', fontWeight: 500 }}>
                                {p.username}
                              </Typography>
                              <Box component="span">{p.flag}</Box>
                              {p.badges?.map((b, i) => (
                                <Box key={i} component="span" sx={{ ml: 0.5 }}>
                                  {b}
                                </Box>
                              ))}
                            </Stack>
                            <Typography sx={{ fontWeight: 600 }}>{p.score}</Typography>
                          </Stack>
                        ))}
                    </Paper>
                  </>
                )}
              </>
            )}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

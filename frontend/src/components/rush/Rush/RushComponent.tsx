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
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';

import { IconCounter } from './components/IconCounter/IconCounter.tsx';
import { times, puzzles, mockPlayers } from './mocks/mock.ts';
import Countdown from 'react-countdown';

import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ExtensionIcon from '@mui/icons-material/Extension';
import WbSunnyIcon from '@mui/icons-material/CalendarToday';
import SyncIcon from '@mui/icons-material/Autorenew';
import { useNavigate } from 'react-router-dom';

import Board from '../Board/Board';
import CountdownOverlay from './components/StartCountDown/CountdownOverlay.tsx';
import ItemSX from './components/ItemSX/ItemSX.tsx';
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
  const theme = useTheme();
  const { t } = useTranslation();

  const [mainTab, setMainTab] = useState<'play' | 'leaderboard'>('play');
  const [boardTab, setBoardTab] = useState<'global' | 'friends' | 'personal'>('global');

  const [range, setRange] = useState<'daily' | 'weekly' | 'all'>('all');

  const handleMainTab = (_: any, v: string) => setMainTab(v as any);
  const handleBoardTab = (_: any, v: string) => setBoardTab(v as any);
  const handleRange = (e: SelectChangeEvent) => setRange(e.target.value as any);

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
            {/* BACK BUTTON + TITLE */}
            <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
              <IconButton size="small" onClick={() => navigate('/')}>
                <ArrowBackIosNewIcon sx={{ color: theme.palette.text.secondary }} />
              </IconButton>
              <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Chesscup
                </Typography>
              </Box>
              <Box sx={{ width: 40 }} />
            </Stack>

            {/* Puzzle icon */}
            <Box sx={{ textAlign: 'center', my: 1 }}>
              <ExtensionIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />
            </Box>

            {/* Top stats */}
            <Stack direction="row" justifyContent="space-around" mb={1}>
              <Stack alignItems="center">
                <WbSunnyIcon sx={{ color: theme.palette.text.secondary }} />
                <Typography variant="h6">--</Typography>
                <Typography variant="caption" sx={{ textTransform: 'uppercase' }}>
                  Best Today
                </Typography>
              </Stack>
              <Stack alignItems="center">
                <SyncIcon sx={{ color: theme.palette.text.secondary }} />
                <Typography variant="h6">--</Typography>
                <Typography variant="caption" sx={{ textTransform: 'uppercase' }}>
                  Top Score
                </Typography>
              </Stack>
            </Stack>

            {isStarted ? (
              <>
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  {!showCountdown && (
                    <Timer
                      countdownRef={countdownRef}
                      durationMs={200000}
                      onStart={() => console.log('🔔 Timer has started')}
                      onComplete={() => {
                        console.log('🏁 Timer finished');
                        setShowResults(true);
                        setIsStarted(false);
                      }}
                    />
                  )}
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
                        const active = false;
                        return (
                          <Box
                            key={t.key}
                            onClick={() => navigate(t.path)}
                            sx={ItemSX(active, theme)}
                          >
                            <Icon icon={t.icon} width={80} height={80} />
                            <Typography
                              sx={{
                                mt: 1,
                                fontSize: 16,
                                fontWeight: 700,
                                color: theme.palette.text.primary,
                              }}
                            >
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
                    <FormControl
                      size="small"
                      sx={{
                        mt: 1,
                        mb: 1,
                        minWidth: 120,
                        '& .MuiInputLabel-root': {
                          color: theme.palette.text.secondary,
                        },
                        '& .MuiSelect-icon': {
                          color: theme.palette.text.secondary,
                        },
                      }}
                    >
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
                        bgcolor: theme.palette.background.paper,
                        borderColor: theme.palette.divider,
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
                              '&:nth-of-type(odd)': {
                                bgcolor: theme.palette.action.hover,
                              },
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography sx={{ width: 24 }}>#{p.rank}</Typography>
                              <Avatar src={p.avatarUrl} sx={{ width: 32, height: 32 }} />
                              {p.title && (
                                <Box
                                  sx={{
                                    fontSize: 12,
                                    px: 0.5,
                                    py: 0.2,
                                    border: `1px solid ${theme.palette.divider}`,
                                    borderRadius: '4px',
                                  }}
                                >
                                  {p.title}
                                </Box>
                              )}
                              <Typography
                                sx={{
                                  color: theme.palette.primary.main,
                                  fontWeight: 500,
                                }}
                              >
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

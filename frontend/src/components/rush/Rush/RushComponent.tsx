import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Stack,
  Avatar,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button,
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { IconCounter } from './components/IconCounter/IconCounter.tsx';
import Countdown from 'react-countdown';

import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ExtensionIcon from '@mui/icons-material/Extension';
import WbSunnyIcon from '@mui/icons-material/CalendarToday';
import SyncIcon from '@mui/icons-material/Autorenew';
import { useNavigate } from 'react-router-dom';
import boltIcon from '@iconify-icons/twemoji/high-voltage';
import clockIcon from '@iconify-icons/twemoji/stopwatch';
import skullIcon from '@iconify-icons/twemoji/skull-and-crossbones';
import Board from '../Board/Board';
import CountdownOverlay from './components/StartCountDown/CountdownOverlay.tsx';
import { Api } from 'chessground/api';
import { toColor, toDests, aiPlay, playOtherSide } from './util.ts';
import './styles.css';

// import puzzles from './const';
import CurrentPuzzle from './current/current';
import { Chess, SQUARES, Color } from 'chess.js';
import { parseUci, Move } from 'chessops';
import { PromotionCtrl, WithGround } from '../chessground/promotionCtrl.ts';
import Timer from './components/Timer/Timer.jsx';
import ResultCard from './components/ResultCard/ResultCard.jsx';
type Uci = string | undefined;
type Key = string | undefined;
window.chess = new Chess();
declare global {
  interface Window {
    addCorrectPuzzle?: (puzzle: CurrentPuzzle, result: boolean) => Promise<void>;
  }
}
// export function toDests(chess: Chess): Map<Key, Key[]> {
//   const dests = new Map();
//   SQUARES.forEach((s) => {
//     const ms = chess.moves({ square: s, verbose: true });
//     if (ms.length)
//       dests.set(
//         s,
//         ms.map((m) => m.to),
//       );
//   });
//   return dests;
// }

// export function toColor(chess: Chess): Color {
//   return chess.turn() === 'w' ? 'white' : 'black';
// }

// const data = [
//   { ok: true, value: 156 },
//   { ok: true, value: 203 },
//   { ok: true, value: 284 },
//   /* … ваш массив … */
//   { ok: false, value: 2338 },
// ];

if (!window.site) window.site = {} as Site;
if (!window.site.load)
  window.site.load = new Promise<void>(function (resolve) {
    document.addEventListener('DOMContentLoaded', function () {
      resolve();
    });
  });

interface Player {
  rank: number;
  title?: string;
  username: string;
  flag: string;
  avatarUrl?: string;
  badges?: string[];
  score: number;
}

interface ItemConfig<T extends string> {
  key: T;
  label: string;
  icon: any;
  // **relative** paths under /rush
  path: string;
}

type Time = '3' | '5' | 'survival';

const times: ItemConfig<Time>[] = [
  { key: '3', label: '3 min', icon: boltIcon, path: 'puzzle/3' },
  { key: '5', label: '5 min', icon: clockIcon, path: 'puzzle/5' },
  { key: 'survival', label: 'Survival', icon: skullIcon, path: 'puzzle/survival' },
];

const mockPlayers: Player[] = [
  { rank: 1, title: 'GM', username: 'Msb2', flag: '🇩🇪', badges: ['💎'], score: 93 },
  { rank: 2, username: 'Sarvesh1300', flag: '🇺🇸', score: 80 },
  { rank: 3, username: 'jt898989', flag: '🇵🇭', badges: ['♕'], score: 80 },
  { rank: 4, username: 'lixifan', flag: '🇨🇳', badges: ['♕', '💎'], score: 80 },
  { rank: 5, username: 'snr1024', flag: '🇨🇳', score: 80 },
  { rank: 6, title: 'FM', username: 'tepcovua2007', flag: '🇻🇳', badges: ['💎'], score: 79 },
  { rank: 7, title: 'FM', username: 'McQueen444', flag: '🇺🇸', badges: ['♕'], score: 79 },
  { rank: 8, title: 'IM', username: 'PawnPromotes', flag: '🇪🇸', badges: ['♕'], score: 79 },
  { rank: 9, username: 'MahsaWitreko', flag: '🇺🇦', badges: ['🍌'], score: 79 },
  { rank: 10, title: '★', username: 'TD9', flag: '🇹🇷', badges: ['⭐'], score: 78 },
];

interface Puzzle {
  id: string;
  fen: string;
  theme: string;
}

const puzzles = [
  {
    puzzle_id: '001w5',
    fen: '1rb2rk1/q5P1/4p2p/3p3p/3P1P2/2P5/2QK3P/3R2R1 b - - 0 29',
    moves: 'f8f7 c2h7 g8h7 g7g8q',
    rating: 1049,
    rating_deviation: 80,
    popularity: 85,
    nb_plays: 209,
    themes: 'advancedPawn attraction mate mateIn2 middlegame promotion short',
    game_url: 'https://lichess.org/0e1vxAEn/black#58',
  },
  {
    puzzle_id: '004LZ',
    fen: '8/7R/5p2/p7/7P/2p5/3k2r1/1K2N3 w - - 3 48',
    moves: 'e1g2 c3c2 b1a2 c2c1q h7d7 d2e2',
    rating: 1182,
    rating_deviation: 77,
    popularity: 93,
    nb_plays: 2032,
    themes: 'advancedPawn crushing defensiveMove deflection endgame long promotion',
    game_url: 'https://lichess.org/drahwNdj#95',
  },
];
interface CorrectPuzzle {
  id: string;
  rating: number;
  result: boolean;
}
window.puzzlesCounter = -1;
window.currentPuzzle;
// window.currentMoveCounter = 0;
export default function PuzzleRush() {
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<'play' | 'leaderboard'>('play');
  const [boardTab, setBoardTab] = useState<'global' | 'friends' | 'personal'>('global');
  const [position, setPosition] = useState<string>(
    'rnbqkb1r/pp1ppppp/5n2/8/3N1B2/8/PPP1PPPP/RN1QKB1R b KQkq - 0 4',
  );
  const delay = 2000;
  let it = 0;
  let index = 0;

  let unit: Unit, cg: Api, vnode: VNode;

  const [range, setRange] = useState<'daily' | 'weekly' | 'all'>('all');
  const { pathname } = useLocation();

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
  const [selTime, setSelTime] = useState<Time>('5');
  // keep state in sync with URL
  // useEffect(() => {
  //   const parts = pathname.replace(/^\/rush\/?/, '').split('/');
  //   const [m, t] = parts;
  //   if (['puzzle', 'duel', 'tournament'].includes(m)) {
  //     setSelMode(m as Mode);
  //     if (['3', '5', 'survival'].includes(t)) setSelTime(t as Time);
  //   }
  // }, [pathname]);

  // стейты для ответа
  // const [puzzles, setPuzzles] = useState<Puzzle[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Параметры запроса – можно взять из селектора, URL, контекста…
  const level = 3;
  const theme = 'fork';
  const limit = 5;
  let moves = 0;

  const withGround: WithGround = (f) => {
    const g = window.cg as Api | undefined;
    console.log(g?.getFen());

    return g ? f(g) : undefined;
  };
  const [promoVisible, setPromoVisible] = useState(false);

  // const userMove = (orig: Key, dest: Key): void => {
  //   console.log(`User move: ${orig} to ${dest}`);
  //   console.log(promotion.start(orig, dest, { submit: playUserMove }));

  //   if (!promotion.start(orig, dest, { submit: playUserMove })) playUserMove(orig, dest);
  // };

  // const playUserMove = (orig: Key, dest: Key, promotion?: Role): void =>
  //   playUci(`${orig}${dest}${promotion ? (promotion === 'knight' ? 'n' : promotion[0]) : ''}`);

  // const playUci = (uci: Uci): void => {
  //   console.log(`Playing UCI: ${uci}`);
  //   return;

  // this.redraw();
  // this.redrawQuick();
  // this.redrawSlow();
  // }
  // this.setGround();
  // if (this.run.current.moveIndex < 0) {
  //   this.run.current.moveIndex = 0;
  //   this.setGround();
  // }
  // pubsub.emit('ply', this.run.moves);
  // }

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

    // window.currentPuzzle = new CurrentPuzzle(puzzlesCounter, puzzles[puzzlesCounter]);
    // window.chess.load(puzzles[puzzlesCounter].fen);
    // // window.chess.move(currentPuzzle.expectedMove());

    // window.cg.set({
    //   fen: window.chess.fen(),
    //   turnColor: toColor(window.chess),
    //   movable: {
    //     free: false,
    //     color: toColor(window.chess),
    //     dests: toDests(window.chess),
    //   },
    // });
    // // currentPuzzle.moveIndex++;
    // console.log(`Current puzzle: ${currentPuzzle.index}, moveIndex: ${currentPuzzle.moveIndex}`);

    // setTimeout(() => {
    //   window.chess.move(currentPuzzle.expectedMove());
    //   window.cg.set({
    //     fen: window.chess.fen(),
    //     turnColor: toColor(window.chess),
    //     movable: {
    //       free: false,
    //       color: toColor(window.chess),
    //       dests: toDests(window.chess),
    //     },
    //   });
    //   currentPuzzle.moveIndex++;
    // }, 1000);

    //   return;
  };

  window.setNextPuzzle = async () => {
    window.puzzlesCounter++;
    window.currentPuzzle = new CurrentPuzzle(puzzlesCounter, puzzles[puzzlesCounter]);
    window.chess.load(puzzles[puzzlesCounter].fen);

    window.cg.set({
      viewOnly: false,
      fen: window.chess.fen(),
      turnColor: toColor(window.chess),
      movable: {
        free: false,
        color: toColor(window.chess),
        dests: toDests(window.chess),
      },
    });
    // currentPuzzle.moveIndex++;
    // console.log(`Current puzzle: ${currentPuzzle.index}, moveIndex: ${currentPuzzle.moveIndex}`);

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

  // useEffect(() => {
  //   setTimeout(() => {
  //     // if (window.cg !== undefined) {
  //     const fen = '7k/P7/8/8/8/8/4K3/8 w - - 0 1';
  //     const chess = new Chess(fen);
  //     window.cg.set({
  //       fen,
  //       turnColor: toColor(chess),
  //       movable: {
  //         color: toColor(chess),
  //         dests: toDests(chess),
  //       },
  //       events: {
  //         move: userMove,
  //       },
  //     });
  //     // }
  //   }, 1000);
  //   setTimeout(() => {
  //     setPromoVisible(true);
  //   }, 2000);
  //   // инициализируем chessground
  // }, []);

  // useEffect(() => {
  //   if (window.cg !== undefined) {
  //     cg.set({
  //       fen: '8/1N3k2/6p1/8/2P3P1/pr6/R5K1/8 w - - 1 56',
  //       coordinates: true,
  //       movable: {
  //         free: false,
  //         color: 'black',
  //         showDests: true,
  //       },
  //     });
  //   }
  // }, []);

  const [color, setColor] = useState<Color>('black');
  const [showResults, setShowResults] = useState<boolean>(false);

  // useEffect(() => {
  //   // каждые 2 секунды переключаем цвет и видимость
  //   const id = window.setInterval(() => {
  //     setColor((c) => (c === 'white' ? 'white' : 'black'));
  //     setPromoVisible((v) => !v);
  //   }, 2000);

  //   return () => {
  //     window.clearInterval(id);
  //   };
  // }, []);
  console.log(isStarted);
  const countdownRef = useRef<Countdown>(null);
  const [showCountdown, setShowCountdown] = useState(false);

  return (
    <Box display="flex" gap={2}>
      <Box flex={2} sx={{ position: 'relative' }}>
        <h2>
          Цвет: {color}, прево­щение: {promoVisible ? 'ON' : 'OFF'}
        </h2>
        <Board color={color} promoVisible={promoVisible} />
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
      </Box>
      <Box flex={1}>
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
                    durationMs={20000} // 10 секунд
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
                      const active = selTime === t.key;
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
      </Box>
    </Box>
  );
}

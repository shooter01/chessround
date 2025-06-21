import React, { useEffect, useState } from 'react';
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

import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ExtensionIcon from '@mui/icons-material/Extension';
import WbSunnyIcon from '@mui/icons-material/CalendarToday';
import SyncIcon from '@mui/icons-material/Autorenew';
import { useNavigate } from 'react-router-dom';
import boltIcon from '@iconify-icons/twemoji/high-voltage';
import clockIcon from '@iconify-icons/twemoji/stopwatch';
import skullIcon from '@iconify-icons/twemoji/skull-and-crossbones';
import Board from '../Board/Board';
import { Api } from 'chessground/api';
import { toColor, toDests, aiPlay, playOtherSide } from './util.ts';

import puzzles from './const';
import CurrentPuzzle from './current/current';
import { Chess, SQUARES, Color } from 'chess.js';
import { parseUci, Move } from 'chessops';
type Uci = string | undefined;
type Key = string | undefined;

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
  useEffect(() => {
    const parts = pathname.replace(/^\/rush\/?/, '').split('/');
    const [m, t] = parts;
    if (['puzzle', 'duel', 'tournament'].includes(m)) {
      setSelMode(m as Mode);
      if (['3', '5', 'survival'].includes(t)) setSelTime(t as Time);
    }
  }, [pathname]);

  // стейты для ответа
  const [puzzles, setPuzzles] = useState<Puzzle[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Параметры запроса – можно взять из селектора, URL, контекста…
  const level = 3;
  const theme = 'fork';
  const limit = 5;
  let moves = 0;
  let promotion;
  let currentPuzzle;

  const userMove = (orig: Key, dest: Key): void => {
    console.log(`User move: ${orig} to ${dest}`);

    // if (!promotion.start(orig, dest, { submit: this.playUserMove })) playUserMove(orig, dest);
  };

  const playUserMove = (orig: Key, dest: Key, promotion?: Role): void =>
    playUci(`${orig}${dest}${promotion ? (promotion === 'knight' ? 'n' : promotion[0]) : ''}`);

  const playUci = (uci: Uci): void => {
    // const now = getNow();
    // const puzzle = this.run.current;
    // if (puzzle.startAt + config.minFirstMoveTime > now) console.log('reverted!');
    // else {
    moves++;
    promotion.cancel();
    const pos = puzzle.position();
    pos.play(parseUci(uci)!);
    if (pos.isCheckmate() || uci === puzzle.expectedMove()) {
      puzzle.moveIndex++;
      // this.socketSend('racerScore', this.localScore);
      if (puzzle.isOver()) {
        if (!this.incPuzzle(true)) this.end();
      } else {
        puzzle.moveIndex++;
      }
      // this.run.current.playSound(puzzle);
    }
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
  };

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    setPuzzles(null);
    try {
      // собираем query-string
      const params = new URLSearchParams({
        level: String(level),
        theme,
        limit: String(limit),
      });
      const res = await fetch(`http://localhost:8080/puzzles?${params}`, {
        headers: { Accept: 'application/json' },
        method: 'GET',
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data: Puzzle[] = await res.json();
      setPuzzles(data);
      currentPuzzle = new CurrentPuzzle(index, data[index]);
      const position = currentPuzzle.position();
      console.log(currentPuzzle);
      const chess = new Chess(currentPuzzle.puzzle.fen);

      window.cg.set({
        fen: chess.fen(),

        // turnColor: position.turn,
        // highlight: { lastMove: true, check: true },
        // events: {
        //   move: userMove,
        // },
        // movable: { events: { after: playOtherSide(window.cg, chess) } },

        movable: {
          free: false,
          color: 'white',
          // dests: toDests(chess),

          // showDests: true,
          // dests: toDests(current)
        },
        events: {
          move: userMove,
        },
        // orientation: current.pov, // POV из CurrentPuzzle
        // movable: { free: false },
        // turnColor: toColor(chess),
        // movable: {
        //   color: toColor(chess),
        //   dests: toDests(chess),
        // },
      });

      const moves = chess.moves({ verbose: true });
      const move = chess.move(currentPuzzle.line[index]);
      window.cg.move(move.from, move.to);

      // window.cg.set({

      // });

      console.log(moves);

      window.cg.set({
        fen: chess.fen(),
        turnColor: toColor(chess),
        movable: {
          color: toColor(chess),
          dests: toDests(chess),
        },
      });

      // console.log(chess.ascii());
      // console.log(chess.turn());
      // console.log(window.cg.getState());

      // current.bindBoard(window.cg);

      // получаем chessops.Chess позицию
      // const pos = puzzle.position();
      // экспортируем обратно в FEN
      // const fenStr = pos.export().setup + ' ' + (pos.turn === 'white' ? 'w' : 'b');
      // ставим эту позицию на доску
      // cg.set({ fen: fenStr });

      // window.cg.set({
      //   fen: current.puzzle.fen,
      //   viewOnly: false,

      //   turnColor: position.turn,
      //   highlight: { lastMove: true, check: true },
      //   events: {
      //     move: userMove,
      //   },
      //   movable: {
      //     free: true,
      //     color: position.turn,
      //     // showDests: true,
      //     // dests: toDests(current)
      //   },
      //   // orientation: current.pov, // POV из CurrentPuzzle
      //   // movable: { free: false },
      //   // turnColor: toColor(chess),
      //   // movable: {
      //   //   color: toColor(chess),
      //   //   dests: toDests(chess),
      //   // },
      // });
      // console.log(current.expectedMove());

      // position.play(current.expectedMove() as Move);

      // window.cg.set({
      //   fen: current.puzzle.fen,
      // });

      // console.log(move);

      // window.cg.set({
      //   fen: current.puzzle.fen,
      //   orientation: current.pov, // POV из CurrentPuzzle
      //   movable: { free: false },
      // });
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <Box display="flex" gap={2}>
      <div id="controls">
        <button id="prev">Prev Move</button>
        <button id="next">Next Move</button>
      </div>
      <Box flex={2}>
        <Board position={position} />
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
                        <Avatar src={p.avatarUrl} sx={{ width: 32, height: 32, bgcolor: '#ccc' }} />
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
        </Box>
      </Box>
    </Box>
  );
}

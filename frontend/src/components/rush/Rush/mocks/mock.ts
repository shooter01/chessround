import boltIcon from '@iconify-icons/twemoji/high-voltage';
import clockIcon from '@iconify-icons/twemoji/stopwatch';
import skullIcon from '@iconify-icons/twemoji/skull-and-crossbones';

export interface Puzzle {
  fen: string;
  line: string; // UCI-строка ходов, например "a8q"
  // …другие поля по вашему интерфейсу…
}

export const mockPuzzles: Puzzle[] = [
  {
    // Белый король на e2, черный — на h8, пешка на a7, белые ходят
    fen: '7k/P7/8/8/8/8/4K3/8 w - - 0 1',
    // единственный ход — a7→a8 с превращением в ферзя (q)
    line: 'a8q',
  },
];

export const times: ItemConfig<Time>[] = [
  { key: '3', label: '3 min', icon: boltIcon, path: 'puzzle/3' },
  { key: '5', label: '5 min', icon: clockIcon, path: 'puzzle/5' },
  { key: 'survival', label: 'Survival', icon: skullIcon, path: 'puzzle/survival' },
];

export const mockPlayers: Player[] = [
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

export const puzzles = [
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

import boltIcon from '@iconify-icons/twemoji/high-voltage';
import clockIcon from '@iconify-icons/twemoji/stopwatch';
import skullIcon from '@iconify-icons/twemoji/skull-and-crossbones';

export interface Puzzle {
  fen: string;
  line: string; // UCI-строка ходов, например "a8q"
  // …другие поля по вашему интерфейсу…
}

export interface ItemConfig<T> {
  key: string;
  label: string;
  icon: any;
  path: string;
}

export interface Time {
  key: string;
  label: string;
  icon: any;
  path: string;
}

export interface Player {
  rank: number;
  title?: string;
  username: string;
  flag: string;
  badges?: string[];
  score: number;
}

export const mockPuzzles: Puzzle[] = [
  {
    // Белый король на e2, черный — на h8, пешка на a7, белые ходят
    fen: '7k/P7/8/8/8/8/4K3/8 w - - 0 1',
    // единственный ход — a7→a8 с превращением в ферзя (q)
    line: 'a8q',
  },
];

// Функция для создания массива times с переводами
export const createTimes = (t: (key: string) => string): ItemConfig<Time>[] => [
  { key: '3', label: t('rush.times.threeMin'), icon: boltIcon, path: 'puzzle/3' },
  { key: '5', label: t('rush.times.fiveMin'), icon: clockIcon, path: 'puzzle/5' },
  { key: 'survival', label: t('rush.times.survival'), icon: skullIcon, path: 'puzzle/survival' },
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
    puzzle_id: '000rO',
    fen: '3R4/8/K7/pB2b3/1p6/1P2k3/3p4/8 w - - 4 58',
    moves: 'a6a5 e5c7 a5b4 c7d8',
    rating: 1110,
    rating_deviation: 82,
    popularity: 85,
    nb_plays: 69,
    themes: 'crushing endgame fork master short',
    game_url: 'https://lichess.org/tzeeBEc2#115',
  },
  {
    puzzle_id: '001wr',
    fen: 'r4rk1/p3ppbp/Pp1q1np1/3PpbB1/2B5/2N5/1PPQ1PPP/3RR1K1 w - - 4 18',
    moves: 'f2f3 d6c5 g1h1 c5c4',
    rating: 999,
    rating_deviation: 77,
    popularity: 97,
    nb_plays: 2286,
    themes: 'advantage fork master masterVsMaster middlegame short',
    game_url: 'https://lichess.org/KnJ2mojX#35',
    opening_tags: 'Pirc_Defense Pirc_Defense_Classical_Variation',
  },
  {
    puzzle_id: '002GQ',
    fen: '5rk1/5ppp/4p3/4N3/8/1Pn5/5PPP/5RK1 w - - 0 28',
    moves: 'f1c1 c3e2 g1f1 e2c1',
    rating: 655,
    rating_deviation: 81,
    popularity: 73,
    nb_plays: 133,
    themes: 'crushing endgame fork short',
    game_url: 'https://lichess.org/2K7g2pDT#55',
  },
  {
    puzzle_id: '003Jb',
    fen: '6k1/3bqr1p/2rpp1pR/p7/Pp1QP3/1B3P2/1PP3P1/2KR4 w - - 6 22',
    moves: 'd4a7 e7g5 c1b1 g5h6',
    rating: 993,
    rating_deviation: 81,
    popularity: 90,
    nb_plays: 391,
    themes: 'advantage fork master middlegame short',
    game_url: 'https://lichess.org/8RvK0idj#43',
  },
  {
    puzzle_id: '003jH',
    fen: 'rn3rk1/p5pp/3N4/4np1q/5Q2/1P3K2/PB1P2P1/2R4R w - - 0 25',
    moves: 'f3f2 e5d3 f2e3 d3f4 h1h5 f4h5',
    rating: 1067,
    rating_deviation: 78,
    popularity: 89,
    nb_plays: 315,
    themes: 'crushing fork long middlegame',
    game_url: 'https://lichess.org/3CQGofXT#49',
  },
  {
    puzzle_id: '003jb',
    fen: 'r3kb1r/p4ppp/b1p1p3/3q4/3Q4/4BN2/PPP2PPP/R3K2R b KQkq - 0 11',
    moves: 'c6c5 d4a4 a6b5 a4b5',
    rating: 960,
    rating_deviation: 85,
    popularity: 95,
    nb_plays: 2563,
    themes: 'crushing fork master middlegame short',
    game_url: 'https://lichess.org/960EzUS0/black#22',
    opening_tags: 'French_Defense French_Defense_Classical_Variation',
  },
  {
    puzzle_id: '003jv',
    fen: '1R6/1p2k2p/p2n2p1/4K3/8/6P1/P6P/8 w - - 10 37',
    moves: 'b8h8 d6f7 e5e4 f7h8',
    rating: 1006,
    rating_deviation: 83,
    popularity: 89,
    nb_plays: 338,
    themes: 'crushing endgame fork short',
    game_url: 'https://lichess.org/n0UvwK36#73',
  },
  {
    puzzle_id: '003o0',
    fen: 'r1bqk2r/pp1nbppp/3p4/1B1p4/3P1B2/8/PPP2PPP/R2QK1NR w KQkq - 2 9',
    moves: 'g1f3 d8a5 d1d2 a5b5',
    rating: 988,
    rating_deviation: 82,
    popularity: 90,
    nb_plays: 668,
    themes: 'advantage fork master opening short',
    game_url: 'https://lichess.org/Ae0t9V1Z#17',
    opening_tags: 'Czech_Defense Czech_Defense_Other_variations',
  },
  {
    puzzle_id: '003r5',
    fen: 'r2qr1k1/ppp2ppp/4b3/3P4/1nP2Q2/2N2N1P/PP3KP1/R4R2 w - - 1 15',
    moves: 'd5e6 b4d3 f2g1 d3f4',
    rating: 1107,
    rating_deviation: 77,
    popularity: 88,
    nb_plays: 859,
    themes: 'crushing fork middlegame short',
    game_url: 'https://lichess.org/JPN97v7j#29',
    opening_tags: 'Kings_Gambit_Accepted Kings_Gambit_Accepted_Abbazia_Defense',
  },
  {
    puzzle_id: '004nd',
    fen: '3q2k1/2r5/pp3p1Q/2b1n3/P3N3/2P5/1P4PP/R6K b - - 0 24',
    moves: 'c7d7 e4f6 d8f6 h6f6',
    rating: 898,
    rating_deviation: 75,
    popularity: 83,
    nb_plays: 207,
    themes: 'crushing fork middlegame short',
    game_url: 'https://lichess.org/IajkZZBp/black#48',
  },
  {
    puzzle_id: '0050w',
    fen: '5rk1/1p2p1rp/p2p4/2pPb2R/2P1P3/1P1BKP1R/8/8 b - - 4 30',
    moves: 'g7g3 h3g3 e5g3 h5g5 g8f7 g5g3',
    rating: 1068,
    rating_deviation: 80,
    popularity: 90,
    nb_plays: 1500,
    themes: 'crushing endgame fork long',
    game_url: 'https://lichess.org/QD8pUcTR/black#60',
  },
  {
    puzzle_id: '005nD',
    fen: '3rk2r/2qn1pp1/p1Q1R3/3n3p/8/8/PP4PP/5R1K b k - 0 23',
    moves: 'f7e6 c6e6 d5e7 e6f7',
    rating: 1005,
    rating_deviation: 75,
    popularity: 99,
    nb_plays: 938,
    themes: 'fork mate mateIn2 middlegame short',
    game_url: 'https://lichess.org/hlgaj6lV/black#46',
  },
  {
    puzzle_id: '007XE',
    fen: '2kr3r/p1p1bpp1/2p2n1p/8/8/1P6/P1P1RPPP/RNB3K1 w - - 1 16',
    moves: 'e2e7 d8d1 e7e1 d1e1',
    rating: 645,
    rating_deviation: 91,
    popularity: 79,
    nb_plays: 75,
    themes: 'backRankMate fork mate mateIn2 middlegame short',
    game_url: 'https://lichess.org/f4f7UwiT#31',
    opening_tags: 'Kings_Pawn_Game Kings_Pawn_Game_Leonardis_Variation',
  },
  {
    puzzle_id: '008P4',
    fen: '8/4k3/1p1p4/rP2p1p1/P2nP1P1/3BK3/8/R7 w - - 0 35',
    moves: 'e3d2 d4b3 d2c3 b3a1',
    rating: 648,
    rating_deviation: 104,
    popularity: 94,
    nb_plays: 1578,
    themes: 'crushing endgame fork short',
    game_url: 'https://lichess.org/3GoHPRp3#69',
  },
  {
    puzzle_id: '009tE',
    fen: '6k1/6pp/p1N2p2/1pP2bP1/5P2/8/PPP5/3K4 b - - 1 28',
    moves: 'f6g5 c6e7 g8f7 e7f5',
    rating: 671,
    rating_deviation: 95,
    popularity: 89,
    nb_plays: 750,
    themes: 'crushing endgame fork short',
    game_url: 'https://lichess.org/fUV1iXBx/black#56',
  },
  {
    puzzle_id: '00Aas',
    fen: '3r1rk1/1p2q1pp/5p2/8/1P1n4/6Q1/PPbB1PPP/R2B1RK1 w - - 9 20',
    moves: 'd1c2 d4e2 g1h1 e2g3 f2g3 d8d2',
    rating: 1054,
    rating_deviation: 77,
    popularity: 97,
    nb_plays: 7812,
    themes: 'crushing fork long middlegame',
    game_url: 'https://lichess.org/wYjuq3zz#39',
  },
  {
    puzzle_id: '00BJm',
    fen: 'r2q1rk1/1Q2bppp/p1N1p3/1p6/2pP1n2/2P5/PP3PPP/R4RK1 b - - 1 18',
    moves: 'd8d5 c6e7 g8h8 e7d5',
    rating: 1078,
    rating_deviation: 138,
    popularity: 100,
    nb_plays: 11,
    themes: 'advantage fork hangingPiece middlegame short',
    game_url: 'https://lichess.org/Umzi5RNZ/black#36',
    opening_tags: 'Queens_Pawn_Game Queens_Pawn_Game_Colle_System',
  },
  {
    puzzle_id: '00BNd',
    fen: '1rr3k1/3bppbp/3p1np1/1B1N4/P2BP3/5P2/P2R2PP/R5K1 b - - 0 21',
    moves: 'd7b5 d5e7 g8f8 e7c8',
    rating: 946,
    rating_deviation: 76,
    popularity: 100,
    nb_plays: 119,
    themes: 'advantage fork middlegame short',
    game_url: 'https://lichess.org/52dQ8pN2/black#42',
  },
  {
    puzzle_id: '00Bn4',
    fen: '1k6/pp6/4nNp1/P6p/3pr3/7P/3R1PPK/8 b - - 0 40',
    moves: 'e4e5 f6d7 b8c7 d7e5',
    rating: 691,
    rating_deviation: 100,
    popularity: 85,
    nb_plays: 717,
    themes: 'crushing endgame fork short',
    game_url: 'https://lichess.org/jvMUtZF5/black#80',
  },
  {
    puzzle_id: '00DPI',
    fen: '3r2k1/1B3p1p/6p1/3N4/3p2P1/6r1/5KP1/3R4 b - - 5 35',
    moves: 'g3g4 d5f6 g8g7 f6g4',
    rating: 994,
    rating_deviation: 76,
    popularity: 99,
    nb_plays: 593,
    themes: 'advantage endgame fork short',
    game_url: 'https://lichess.org/Wjj7mxD9/black#70',
  },
];

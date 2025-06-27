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
  path: string;
}

type Time = '3' | '5' | 'survival';

interface Puzzle {
  id: string;
  fen: string;
  theme: string;
}

interface CorrectPuzzle {
  id: string;
  rating: number;
  result: boolean;
}

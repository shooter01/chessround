// interfaces.ts
export interface Puzzle {
  fen: string;
  line: string; // UCI-строка ходов, например "a8q"
  // …другие поля по вашему интерфейсу…
}

// mock.ts

export const mockPuzzles: Puzzle[] = [
  {
    // Белый король на e2, черный — на h8, пешка на a7, белые ходят
    fen: '7k/P7/8/8/8/8/4K3/8 w - - 0 1',
    // единственный ход — a7→a8 с превращением в ферзя (q)
    line: 'a8q',
  },
];

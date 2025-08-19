export function toColor(chess: Chess): Color {
  return chess.turn() === 'w' ? 'white' : 'black';
}

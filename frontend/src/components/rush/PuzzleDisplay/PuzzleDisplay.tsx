// src/components/PuzzleDisplay.tsx

import React, { useState, useEffect } from 'react';
import { Container, Grid, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Chess, SQUARES } from 'chess.js';
import Board from '../Board/Board';
import './styles.css';
import { Chessground } from 'chessground';
import CurrentPuzzle from '../Rush/current/current';
import axios from 'axios';
import { useParams } from 'react-router-dom';

if (!window.site) window.site = {} as Site;
if (!window.site.load)
  window.site.load = new Promise<void>((resolve) => {
    document.addEventListener('DOMContentLoaded', () => resolve());
  });
interface Puzzle {
  puzzle_id: string;
  fen: string;
  moves: string;
  rating: number;
  /* … остальные поля при необходимости */
}
export default function PuzzleDisplay() {
  // читаем puzzleId из URL: <Route path="/puzzle/:puzzleId" …>
  const { puzzle_id } = useParams<{ puzzle_id: string }>();

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [fen, setFen] = useState<string>('');

  useEffect(() => {
    if (!puzzle_id) return;

    // 1) Запрашиваем пазл по ID у Node-бэка
    axios
      .get<Puzzle>(`http://localhost:5000/puzzles/${encodeURIComponent(puzzle_id)}`)
      .then((res) => {
        setPuzzle(res.data);
        setFen(res.data.fen);
        // инициализируем Chess и CurrentPuzzle
        window.puzzlesCounter = -1;
        window.currentPuzzle = new CurrentPuzzle(window.puzzlesCounter, res.data);
        window.chess = new Chess(res.data.fen);
        window.chess.move(window.currentPuzzle.expectedMove());
        setFen(window.chess.fen());
        window.setPosition();
        // window.cg.set({
        //   orientation: currentPuzzle.pov,

        //   movable: {
        //     showDests: true,
        //     free: false,
        //     color: window.currentPuzzle.pov,
        //   },
        // });
      })
      .catch((err) => {
        console.error('Failed to load puzzle:', err);
      });
  }, [puzzle_id]);

  if (!puzzle) {
    return <div>Loading puzzle…</div>;
  }

  // Ссылка в правой панели
  const analysisUrl = `https://lichess.org/analysis/${fen}`;

  return (
    <Container maxWidth="lg">
      <Grid
        container
        spacing={2}
        sx={{ width: '100%', maxWidth: 1400, justifyContent: 'center', mx: 'auto' }}
      >
        {/* Левая часть: доска */}
        <Grid item xs={12} md={8} sx={{ display: 'flex', justifyContent: 'center' }}>
          <Board />
        </Grid>

        {/* Правая часть: кнопки */}
        <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <Button
              component="a"
              href={analysisUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              size="large"
              fullWidth
              sx={{ mb: 1, bgcolor: '#f5b600', '&:hover': { bgcolor: '#e0a200' } }}
            >
              Analyze on lichess.org
            </Button>
            {/* здесь могут быть другие контролы */}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

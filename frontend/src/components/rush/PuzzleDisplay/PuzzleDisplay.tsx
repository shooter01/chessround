// src/components/PuzzleDisplay.tsx

import React, { useState, useEffect } from 'react';
import { Container, Grid, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Chess, SQUARES } from 'chess.js';
import Board from '../Board/Board';
import { puzzles } from './mocks/mock';
import './styles.css';
import { Chessground } from 'chessground';
import CurrentPuzzle from '../Rush/current/current';

if (!window.site) window.site = {} as Site;
if (!window.site.load)
  window.site.load = new Promise<void>((resolve) => {
    document.addEventListener('DOMContentLoaded', () => resolve());
  });

export default function PuzzleDisplay() {
  const puzzle = puzzles[0];

  const [pov, setPov] = useState<'white' | 'black'>('white');
  const [fen, setFen] = useState<string>(puzzle.fen);

  // we assume puzzles[0] is the one we’re displaying
  const { puzzle_id } = puzzle;
  useEffect(() => {
    setTimeout(() => {
      window.puzzlesCounter = -1;
      window.currentPuzzle = new CurrentPuzzle(window.puzzlesCounter, puzzle);
      window.chess = new Chess(fen);
      window.chess.move(currentPuzzle.expectedMove());
      // setPov(window.currentPuzzle.pov);
      // const cg = Chessground(document.getElementById('chessground-examples'));
      // window.cg = cg;
      // console.log(currentPuzzle.expectedMove());
      setFen(chess.fen());
      window.setPosition();
    }, 500);
  }, [fen, puzzle]);

  const analysisUrl = `https://lichess.org/analysis/${fen}`;

  return (
    <Container maxWidth="lg">
      <Grid
        container
        spacing={2}
        sx={{
          width: '100%',
          maxWidth: 1400,
          justifyContent: 'center',
          mx: 'auto',
        }}
      >
        {/* Left: board */}
        <Grid
          item
          xs={12}
          md={8}
          sx={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Board />
        </Grid>

        {/* Right: controls */}
        <Grid
          item
          xs={12}
          md={4}
          sx={{
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 360,
              mx: 'auto',
              textAlign: 'center',
            }}
          >
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
            {/* you can add more controls/buttons here */}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

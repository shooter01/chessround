import React from 'react';
import { Box } from '@mui/material';
import Timer from '../components/Timer/Timer.jsx';
import { IconCounter } from '../components/IconCounter/IconCounter.tsx';

interface GameStateProps {
  showCountdown: boolean;
  correctPuzzles: any[];
  countdownRef: any;
  setShowResults: (show: boolean) => void;
  setIsStarted: (started: boolean) => void;
}

export default function GameState({
  showCountdown,
  correctPuzzles,
  countdownRef,
  setShowResults,
  setIsStarted,
}: GameStateProps) {
  return (
    <>
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        {!showCountdown && (
          <Timer
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
        <IconCounter items={correctPuzzles} />
      </Box>
    </>
  );
} 
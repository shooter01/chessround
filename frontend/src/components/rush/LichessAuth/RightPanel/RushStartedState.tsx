import { Box } from '@mui/material';

import CustomInfoCard from '../components/CustomInfoCard/CustomInfoCard.tsx';

import { IconCounter } from '../components/IconCounter/IconCounter.tsx';
import Timer from '../components/Timer/Timer.js';

export default function RushStartedState({
  isStarted = false,
  loading = false,
  correctPuzzles = [],
  countdownRef,
  setShowResults,
  rushModeCounter,
  pov,
  setIsStarted,
  showCountdown,
}) {
  return (
    <Box
      sx={{
        width: { xs: '100%', sm: 360 },
        bgcolor: 'background.paper',
        boxShadow: (theme) => theme.shadows[6],
        borderRadius: 2,
        p: 2,
        pt: 0,
        pl: 0,
        pr: 0,
        transition: 'transform .2s',
        '&:hover': {
          // transform: 'translateY(-4px)',
          // boxShadow: (theme) => theme.shadows[12],
        },
      }}
    >
      <CustomInfoCard state={pov} text={`${pov.charAt(0).toUpperCase() + pov.slice(1)} to move`} />
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        {!showCountdown && rushModeCounter !== 0 && (
          <Timer
            countdownRef={countdownRef}
            durationMs={rushModeCounter}
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
        <IconCounter items={correctPuzzles} columns={5} />
      </Box>
    </Box>
  );
}

import React, { useRef, useState, useEffect } from 'react';

import {
  Container,
  Grid,
  Box,
  Stack,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Avatar,
  useTheme,
  SelectChangeEvent,
} from '@mui/material';
import { Icon } from '@iconify/react';

import { useTranslation } from 'react-i18next';
import { createTimes, puzzles, mockPlayers } from '../mocks/mock.ts';
import CustomInfoCard from '../components/CustomInfoCard/CustomInfoCard.tsx';

import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ExtensionIcon from '@mui/icons-material/Extension';
import WbSunnyIcon from '@mui/icons-material/CalendarToday';
import SyncIcon from '@mui/icons-material/Autorenew';
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
  const theme = useTheme();
  const { t } = useTranslation();

  const [mainTab, setMainTab] = useState<'play' | 'leaderboard'>('play');
  const [boardTab, setBoardTab] = useState<'global' | 'friends' | 'personal'>('global');

  const [range, setRange] = useState<'daily' | 'weekly' | 'all'>('all');

  const handleMainTab = (_: any, v: string) => setMainTab(v as any);
  const handleBoardTab = (_: any, v: string) => setBoardTab(v as any);
  const handleRange = (e: SelectChangeEvent) => setRange(e.target.value as any);

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

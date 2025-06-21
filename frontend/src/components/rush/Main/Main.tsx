import React, { useEffect, useState } from 'react';
import { Box, Typography, Stack, Button, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import puzzleIcon from '@iconify-icons/twemoji/puzzle-piece';
import swordsIcon from '@iconify-icons/twemoji/crossed-swords';
import trophyIcon from '@iconify-icons/twemoji/trophy';

type Mode = 'puzzle' | 'duel' | 'tournament';
type Time = '3' | '5' | 'survival';

interface ItemConfig<T extends string> {
  key: T;
  label: string;
  icon: any;
  // **relative** paths under /rush
  path: string;
}

const modes: ItemConfig<Mode>[] = [
  { key: 'puzzle', label: 'Puzzle', icon: puzzleIcon, path: 'rush' },
  { key: 'duel', label: 'Duel', icon: swordsIcon, path: 'duel' },
  { key: 'tournament', label: 'Tournament', icon: trophyIcon, path: 'tournaments' },
];

export default function PuzzleSelector() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [selMode, setSelMode] = useState<Mode>('puzzle');
  const [selTime, setSelTime] = useState<Time>('5');

  const itemSx = (active: boolean) => ({
    flex: 1,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'transform .2s, filter .2s',
    transform: active ? 'scale(1.05)' : 'scale(1)',
    filter: active ? 'drop-shadow(0 0 12px rgba(0,0,0,0.3))' : 'none',
    '&:hover': {
      filter: 'drop-shadow(0 0 16px rgba(0,0,0,0.4))',
      transform: 'scale(1.1)',
    },
  });

  return (
    <Box
      sx={{
        width: 500,
        maxWidth: '90vw',
        bgcolor: '#fff',
        borderRadius: 2,
        p: 4,
        textAlign: 'center',
        boxShadow: theme.shadows[3],
        mx: 'auto',
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#aaa', mb: 3 }}>
        PUZZLES
      </Typography>

      {/* Mode icons row */}
      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        {modes.map((m) => {
          const active = selMode === m.key;
          return (
            <Box key={m.key} onClick={() => navigate(m.path)} sx={itemSx(active)}>
              <Icon icon={m.icon} width={80} height={80} />
              <Typography sx={{ mt: 1, fontSize: 16, fontWeight: 700 }}>{m.label}</Typography>
            </Box>
          );
        })}
      </Stack>

      {/* <Typography variant="body1" sx={{ mb: 3, color: '#666' }}>
        {selMode === 'puzzle'
          ? `Solve puzzles in ${selTime === 'survival' ? 'Survival mode' : `${selTime} min`}`
          : selMode === 'duel'
            ? 'Challenge a friend!'
            : 'Join a tournament!'}
      </Typography> */}

      {/* <Button
        variant="contained"
        fullWidth
        sx={{ textTransform: 'none', py: 1.5 }}
        onClick={() => {
          // jump into the currently selected mode/time
          navigate(
            selMode === 'puzzle'
              ? `puzzle/${selTime}`
              : selMode === 'duel'
                ? 'duel'
                : 'tournaments',
          );
        }}
      >
        Start
      </Button> */}
    </Box>
  );
}

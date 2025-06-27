// src/components/PuzzleSelector.tsx

import React, { useState, useMemo } from 'react';
import { Box, Typography, Stack, useTheme, alpha } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import puzzleIcon from '@iconify-icons/twemoji/puzzle-piece';
import swordsIcon from '@iconify-icons/twemoji/crossed-swords';
import trophyIcon from '@iconify-icons/twemoji/trophy';

type Mode = 'puzzle' | 'duel' | 'tournament';

interface ItemConfig<T extends string> {
  key: T;
  label: string;
  icon: any;
  path: string;
}

const modes: ItemConfig<Mode>[] = [
  { key: 'puzzle', label: 'Puzzle', icon: puzzleIcon, path: '/rush' },
  { key: 'duel', label: 'Duel', icon: swordsIcon, path: '/duel' },
  { key: 'tournament', label: 'Tournament', icon: trophyIcon, path: '/tournaments' },
];

export default function PuzzleSelector() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [selMode, setSelMode] = useState<Mode>(null);
  const glowColor = alpha(theme.palette.primary.main, 0.6);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 500,
        bgcolor: theme.palette.background.paper,
        borderRadius: 2,
        p: { xs: 3, sm: 4 },
        textAlign: 'center',
        boxShadow: theme.shadows[3],
        mx: 'auto',
        transition: 'background-color .3s, color .3s',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: theme.palette.text.secondary,
          mb: 3,
        }}
      >
        SELECT MODE
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        {modes.map((m) => {
          return (
            <Box
              key={m.key}
              onClick={() => {
                navigate(m.path);
              }}
              sx={{
                flex: 1,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform .2s',
                transform: 'scale(1)',
                '&:hover': {
                  transform: 'scale(1.1)',
                  '& svg': {
                    filter: `drop-shadow(0 0 8px ${glowColor})`,
                  },
                },
                // Сброс фильтра, чтобы не сохранялось
                '& svg': {
                  filter: 'none',
                  transition: 'filter .2s',
                },
              }}
            >
              <Icon icon={m.icon} width={80} height={80} />
              <Typography
                sx={{
                  mt: 1,
                  fontSize: 16,
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                }}
              >
                {m.label}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

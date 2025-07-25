// src/components/PuzzleSelector.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import puzzleIcon from '@iconify-icons/twemoji/puzzle-piece';
import swordsIcon from '@iconify-icons/twemoji/crossed-swords';
import trophyIcon from '@iconify-icons/twemoji/trophy';
import BuildIcon from '@mui/icons-material/Build';
import { useTranslation } from 'react-i18next';

type Mode = 'puzzle' | 'duel' | 'tournament';

interface ItemConfig<T extends string> {
  key: T;
  label: string;
  icon: any;
  path: string;
}

const modes: ItemConfig<Mode>[] = [
  { key: 'puzzle', label: 'puzzleSelector.modes.puzzle', icon: puzzleIcon, path: '/rush' },
  { key: 'duel', label: 'puzzleSelector.modes.duel', icon: swordsIcon, path: '/duel' },
  {
    key: 'tournament',
    label: 'puzzleSelector.modes.tournament',
    icon: trophyIcon,
    path: '/tournaments',
  },
];

export default function PuzzleSelector() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const glowColor = alpha(theme.palette.primary.main, 0.6);
  const { t } = useTranslation();

  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = (mode: Mode, path: string) => {
    if (mode === 'puzzle') {
      navigate(path);
    } else {
      setModalOpen(true);
    }
  };

  return (
    <>
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
          {t('puzzleSelector.selectMode')}
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
          {modes.map((m) => {
            const isActive = pathname === m.path;
            return (
              <Box
                key={m.key}
                onClick={() => handleClick(m.key, m.path)}
                sx={{
                  flex: 1,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'transform .2s',
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    '& svg:first-of-type': {
                      filter: `drop-shadow(0 0 8px ${glowColor})`,
                    },
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
                  {t(m.label)}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </Box>

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        aria-labelledby="under-construction-title"
      >
        <DialogTitle id="under-construction-title">
          {t('puzzleSelector.underConstructionTitle')}
        </DialogTitle>
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 2,
          }}
        >
          <BuildIcon
            sx={{
              fontSize: 80,
              color: theme.palette.warning.main,
              mb: 1,
            }}
          />
          <Typography variant="body1" align="center">
            {t('puzzleSelector.underConstructionText')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)} color="primary">
            {t('common.ok')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

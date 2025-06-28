import React from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createTimes } from '../mocks/mock.ts';
import ItemSX from '../components/ItemSX/ItemSX.tsx';
import { useTheme } from '@mui/material';

interface PlayTabProps {
  loading: boolean;
  onStart: () => void;
}

export default function PlayTab({ loading, onStart }: PlayTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  // Создаем массив times с переводами
  const times = createTimes(t);

  return (
    <>
      {/* Time icons row */}
      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        {times.map((timen) => {
          const active = false;
          return (
            <Box
              key={timen.key}
              onClick={() => navigate(timen.path)}
              sx={ItemSX(active)}
            >
              <Icon icon={timen.icon} width={80} height={80} />
              <Typography
                sx={{
                  mt: 1,
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'text.primary',
                }}
              >
                {timen.label}
              </Typography>
            </Box>
          );
        })}
      </Stack>

      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          color="primary"
          onClick={onStart}
          disabled={loading}
          sx={theme.palette.mode === 'dark' ? {
            backgroundColor: '#FFD600',
            color: '#222',
            '&:hover': {
              backgroundColor: '#FFEA00',
            },
          } : {}}
        >
          {loading ? <CircularProgress size={24} /> : t('rush.startButton')}
        </Button>
      </Box>
    </>
  );
} 
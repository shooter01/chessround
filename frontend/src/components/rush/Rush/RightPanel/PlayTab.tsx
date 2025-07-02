import React, { useState } from 'react';
import { Box, Stack, Typography, useTheme, Button, CircularProgress } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { createTimes } from '../mocks/mock.ts';

interface PlayTabProps {
  loading: boolean;
  onStart: () => void;
  setRushModeCounter: (time: number) => void;
}

export default function PlayTab({ loading, onStart, setRushModeCounter }: PlayTabProps) {
  const { t } = useTranslation();
  const [activeKey, setActiveKey] = useState<string | null>('5');
  const times = createTimes(t);
  const theme = useTheme();

  return (
    <>
      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        {times.map(({ key, icon, time, label }) => {
          const active = key === activeKey;

          // выбираем подсветку в зависимости от темы
          const glow = active
            ? theme.palette.mode === 'light'
              ? 'drop-shadow(0 0 10px rgba(0,0,0,0.5))'
              : 'drop-shadow(0 0 12px rgba(255,215,0,0.8))'
            : 'none';

          return (
            <Box
              key={key}
              onClick={() => {
                setActiveKey(key);
                setRushModeCounter(time);
              }}
              sx={{
                flex: 1,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform .2s',
                transform: active ? 'scale(1.05)' : 'scale(1)',
                '&:hover': { transform: 'scale(1.1)' },
              }}
            >
              {/* Оборачиваем Icon в Box, чтобы можно было задать sx */}
              <Box
                sx={{
                  transition: 'filter .3s',
                  filter: glow,
                  display: 'inline-block',
                }}
              >
                <Icon icon={icon} width={80} height={80} />
              </Box>

              <Typography sx={{ mt: 1, fontSize: 16, fontWeight: 700, color: 'text.primary' }}>
                {label}
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
          sx={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 700,
            textTransform: 'none', // убирает автоматические капслоки
            ...(theme.palette.mode === 'dark'
              ? {
                  backgroundColor: '#FFD600',
                  color: '#222',
                  '&:hover': {
                    backgroundColor: '#FFEA00',
                  },
                }
              : {}),
          }}
        >
          {loading ? <CircularProgress size={24} /> : t('rush.startButton')}
        </Button>
      </Box>
    </>
  );
}

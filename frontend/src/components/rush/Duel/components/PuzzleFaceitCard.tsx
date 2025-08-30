import React from 'react';
import { Box, Paper, Typography, Stack } from '@mui/material';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';

type WL = 'W' | 'L';

export type PuzzleFaceitInfo = {
  id: string;
  rating?: number | null;
  mv?: number | null; // кол-во ходов пользователя в решении
  side: 'W' | 'B'; // за какую сторону ходит пользователь
  theme?: string | null;
  popularity?: number | null; // 0..100 (если есть в payload)
  last: WL[]; // последние результаты пользователя (W/L)
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Box sx={{ minWidth: 44, textAlign: 'center' }}>
      <Typography variant="caption" sx={{ opacity: 0.7, lineHeight: 1 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.1 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function PuzzleFaceitCard({
  id,
  rating,
  mv,
  side,
  theme,
  popularity,
  last,
}: PuzzleFaceitInfo) {
  return (
    <Paper
      elevation={6}
      sx={{
        px: 1.25,
        py: 0.75,
        bgcolor: '#1e2227',
        color: 'white',
        borderRadius: 1.25,
        border: '1px solid rgba(255,255,255,0.08)',
        minWidth: 240,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* «ник» пазла слева */}
        <Typography
          variant="subtitle2"
          fontWeight={800}
          sx={{ letterSpacing: 0.3, maxWidth: 120 }}
          noWrap
          title={id}
        >
          {id}
        </Typography>

        {/* большой рейтинг справа */}
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1 }}>
            {rating ?? '--'}
          </Typography>
          <AccessTimeOutlinedIcon sx={{ fontSize: 18, opacity: 0.7 }} />
        </Box>
      </Box>

      {/* нижняя строка статов + полоса результатов */}
      <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Stat label="MV" value={mv ?? '--'} />
        <Stat label="SIDE" value={side} />
        <Stat label="THEME" value={(theme || '--').toUpperCase().slice(0, 6)} />
        <Stat label="POP" value={popularity ?? '--'} />

        {/* полоса W/L */}
        <Stack direction="row" spacing={0.5} sx={{ ml: 'auto' }}>
          {last.slice(-5).map((r, i) => (
            <Box
              key={i}
              sx={{
                width: 12,
                height: 12,
                borderRadius: 0.5,
                bgcolor: r === 'W' ? 'success.main' : 'error.main',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.6) inset',
              }}
              title={r}
            />
          ))}
        </Stack>
      </Box>
    </Paper>
  );
}

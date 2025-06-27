// src/components/rush/Logo.tsx

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

/**
 * Logo: компактный трофей + Saira Extra Condensed + адаптивный цвет
 * Подключите в <head> index.html:
 * <link href="https://fonts.googleapis.com/css2?family=Saira+Extra+Condensed:wght@900&display=swap" rel="stylesheet" />
 */
const Logo: React.FC<{ size?: number }> = ({ size = 32 }) => {
  const theme = useTheme();
  // Цвет бренда: в светлой теме — primary.main, в тёмной — жёлтый
  const color = theme.palette.mode === 'light' ? theme.palette.error.dark : '#FFEB3B';

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
      onClick={() => (window.location.href = '/')}
    >
      <Box sx={{ width: size, height: size, mr: 1 }}>
        <EmojiEventsIcon sx={{ width: size, height: size, color }} />
      </Box>
      <Typography
        variant="h6"
        sx={{
          fontFamily: 'Saira Extra Condensed, sans-serif',
          fontWeight: 900,
          fontSize: size * 0.6,
          color,
          lineHeight: 1,
        }}
      >
        сhesscup
      </Typography>
    </Box>
  );
};

export default Logo;

// DuelComponent.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import ResultBattleUser from './components/BattleUser/ResultBattleUser';
import { mockUsers, textResult } from './components/BattleUser/BattleUsersMockData';

const CENTER_W = 48; // место под ⚡/таймер/текст

const DuelComponent: React.FC = () => {
  const [p1, p2] = mockUsers;

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 1.5,
          flexWrap: 'nowrap', // строго в один ряд
          overflow: 'hidden',
        }}
      >
        {/* левая карточка — тянется */}
        <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
          <ResultBattleUser {...p1} dense />
        </Box>

        {/* центр — узкий фикс */}
        <Box
          sx={{
            flex: `0 0 ${CENTER_W}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 0,
          }}
        >
          <Typography variant="caption" fontWeight={700} noWrap>
            {textResult}
          </Typography>
        </Box>

        {/* правая карточка — тянется */}
        <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
          <ResultBattleUser {...p2} dense />
        </Box>
      </Box>
    </Box>
  );
};

export default DuelComponent;

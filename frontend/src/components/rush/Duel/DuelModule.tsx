import React, { useEffect } from 'react';
import { Box, Grid } from '@mui/material';
import DuelComponent from './DuelComponent';
import Board from '../Board/Board';
import { run } from '../chessground/main';

const DuelModule: React.FC = () => {
  return (
    <Box p={2} maxWidth={1200} mx="auto">
      <Box p={2} maxWidth={1200} mx="auto" display="flex" gap={2}>
        <Box flex={2}>
          <Board />
        </Box>
        <Box flex={1}>
          <DuelComponent />
        </Box>
      </Box>
    </Box>
  );
};

export default DuelModule;

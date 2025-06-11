import React from 'react';
import { Box, Grid, Typography, IconButton } from '@mui/material';
import ResultBattleUser from './components/BattleUser/ResultBattleUser';
import { mockUsers, textResult } from './components/BattleUser/BattleUsersMockData';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { useNavigate } from 'react-router-dom';
import Board from '../Board/Board.tsx'; // Adjust the path if Board is located elsewhere

const DuelModule: React.FC = () => {
  const navigate = useNavigate();
  const [p1, p2] = mockUsers;

  return (
    <Box p={2}>
      {/* Header with Back button */}
      <Box display="flex" alignItems="center" justifyContent="center" position="relative" mb={2}>
        {/* Back button in top-left */}
        <IconButton
          onClick={() => navigate('/')}
          sx={{ position: 'absolute', left: 0 }}
          size="small"
        >
          <ArrowBackIosNewIcon />
        </IconButton>

        {/* Title */}
        <Box
          bgcolor="success.main"
          color="common.white"
          py={1}
          px={2}
          borderRadius={1}
          display="inline-flex"
          alignItems="center"
        >
          <FontAwesomeIcon icon={faShieldAlt} style={{ marginRight: 8 }} />
          <Typography variant="h6" component="span" fontWeight="bold">
            Puzzle Duel
          </Typography>
        </Box>
      </Box>

      {/* Duel players */}
      <Grid container alignItems="center" spacing={2}>
        {/* Left player */}
        <Grid item xs={12} sm={5}>
          <ResultBattleUser {...p1} />
        </Grid>

        {/* Result in center */}
        <Grid item xs={12} sm={2} textAlign="center">
          <Typography variant="h5" color="text.secondary" fontWeight={500}>
            {textResult}
          </Typography>
        </Grid>

        {/* Right player */}
        <Grid item xs={12} sm={5}>
          <ResultBattleUser {...p2} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DuelModule;

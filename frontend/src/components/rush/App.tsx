import React, { useEffect } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import DuelModule from './Duel/DuelModule.tsx';
import Main from './Main/Main.tsx';
import TournamentModule from './Tournament/TournamentModule.tsx';
import Rush from './Rush/Rush.tsx';
import { Route, Routes } from 'react-router-dom';
import TournamentResults from './Tournament/TournamentResults/TournamentResults.tsx';

const RushModule: React.FC = () => {
  return (
    <Routes>
      <Route path="/duel" element={<DuelModule />} />
      <Route path="/tournaments" element={<TournamentModule />} />
      <Route path="/tournaments/:slug" element={<TournamentResults />} />
      <Route path="/rush/*" element={<Rush />} />
      <Route path="/" element={<Main />} />
    </Routes>
  );
};

export default RushModule;

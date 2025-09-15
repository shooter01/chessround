import React, { useEffect } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import DuelModule from './Duel/DuelModule.tsx';
import DuelGame from './Duel/DuelGame.tsx';
import DuelWatchModule from './Duel/Viewer/DuelSpectator.js';
import Main from './Main/Main.tsx';
import TournamentModule from './Tournament/TournamentModule.tsx';
import Rush from './Rush/Rush.tsx';
import { Route, Routes } from 'react-router-dom';
import TournamentResults from './Tournament/TournamentResults/TournamentResults.tsx';
import PuzzleDisplay from './PuzzleDisplay/PuzzleDisplay.tsx';
import LichessAuth from './LichessAuth/LichessAuth.tsx';
import LichessCallback from './LichessAuth/LichessCallback.tsx';
import Header from './Header.tsx';
import { CustomThemeProvider } from './context/ColorModeContext.tsx'; // Adjust the path if needed
import './index.css';

const RushModule: React.FC = () => {
  return (
    <CustomThemeProvider>
      <Header />
      <Routes>
        <Route path="/duel" element={<DuelModule />} />
        <Route path="/duel/:shortId" element={<DuelGame />} /> {/* <- добавили */}
        <Route path="/duel/:shortId/watch" element={<DuelWatchModule />} />
        <Route path="/tournaments" element={<TournamentModule />} />
        <Route path="/tournaments/:slug" element={<TournamentResults />} />
        <Route path="/rush/*" element={<Rush />} />
        <Route path="/puzzle/:puzzle_id" element={<PuzzleDisplay />} />
        <Route path="/auth" element={<LichessAuth />} />
        <Route path="/lichess-callback" element={<LichessCallback />} />
        <Route path="/" element={<Main />} />
      </Routes>
    </CustomThemeProvider>
  );
};

export default RushModule;

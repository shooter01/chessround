import React, { useRef, useState, useEffect } from 'react';

import { Box, Stack, IconButton, Typography, Tabs, Tab, useTheme } from '@mui/material';

import { useTranslation } from 'react-i18next';
import LeaderboardTab from '../components/LeaderboardTab/LeaderboardTab.tsx';

import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ExtensionIcon from '@mui/icons-material/Extension';
import WbSunnyIcon from '@mui/icons-material/CalendarToday';
import SyncIcon from '@mui/icons-material/Autorenew';
import { useNavigate } from 'react-router-dom';
import PlayTab from './PlayTab';
import GameState from './GameState';

export default function RushDefaultState({
  isStarted = false,
  loading = false,
  correctPuzzles = [],
  countdownRef,
  setRushModeCounter,
  setMode,
  setShowResults,
  bestAllTime,
  token,
  bestToday,
  setIsStarted,
  showCountdown,
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [mainTab, setMainTab] = useState<'play' | 'leaderboard'>('play');

  const handleMainTab = (_: any, v: string) => setMainTab(v as any);

  return (
    <Box
      sx={{
        width: { xs: '100%', sm: 360 },
        bgcolor: 'background.paper',
        boxShadow: (theme) => theme.shadows[6],
        borderRadius: 2,
        p: 2,
        transition: 'transform .2s',
        '&:hover': {
          // transform: 'translateY(-4px)',
          // boxShadow: (theme) => theme.shadows[12],
        },
      }}
    >
      {/* BACK BUTTON + TITLE */}
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <IconButton size="small" onClick={() => navigate('/')}>
          <ArrowBackIosNewIcon sx={{ color: theme.palette.text.secondary }} />
        </IconButton>
        <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t('rush.title')}
          </Typography>
        </Box>
        <Box sx={{ width: 40 }} />
      </Stack>

      {/* Puzzle icon */}
      <Box sx={{ textAlign: 'center', my: 1 }}>
        <ExtensionIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />
      </Box>

      {/* Top stats */}
      <Stack direction="row" justifyContent="space-around" mb={1}>
        <Stack alignItems="center">
          <WbSunnyIcon sx={{ color: theme.palette.text.secondary }} />
          <Typography variant="h6">{bestToday}</Typography>
          <Typography variant="caption" sx={{ textTransform: 'uppercase' }}>
            {t('rush.bestToday')}
          </Typography>
        </Stack>
        <Stack alignItems="center">
          <SyncIcon sx={{ color: theme.palette.text.secondary }} />
          <Typography variant="h6">{bestAllTime}</Typography>
          <Typography variant="caption" sx={{ textTransform: 'uppercase' }}>
            {t('rush.topScore')}
          </Typography>
        </Stack>
      </Stack>

      {isStarted ? (
        <GameState
          showCountdown={showCountdown}
          correctPuzzles={correctPuzzles}
          countdownRef={countdownRef}
          setShowResults={setShowResults}
          setIsStarted={setIsStarted}
        />
      ) : (
        <>
          {/* Main tabs */}
          <Tabs
            value={mainTab}
            onChange={handleMainTab}
            textColor="primary"
            indicatorColor="primary"
            sx={{ mb: 1 }}
          >
            <Tab label={t('rush.playTab')} value="play" />
            <Tab label={t('rush.leaderboardTab')} value="leaderboard" />
          </Tabs>

          {mainTab === 'play' && (
            <PlayTab
              loading={loading}
              setRushModeCounter={setRushModeCounter}
              setMode={setMode}
              onStart={handleStart}
            />
          )}

          {mainTab === 'leaderboard' && (
            <>
              <LeaderboardTab range="all" token={token} />
            </>
          )}
        </>
      )}
    </Box>
  );
}

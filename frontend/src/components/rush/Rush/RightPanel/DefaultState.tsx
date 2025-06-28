import React, { useRef, useState, useEffect } from 'react';

import {
  Container,
  Grid,
  Box,
  Stack,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Avatar,
  useTheme,
  SelectChangeEvent,
} from '@mui/material';
import { Icon } from '@iconify/react';

import { useTranslation } from 'react-i18next';
import { createTimes, puzzles, mockPlayers } from '../mocks/mock.ts';
import ItemSX from '../components/ItemSX/ItemSX.tsx';

import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ExtensionIcon from '@mui/icons-material/Extension';
import WbSunnyIcon from '@mui/icons-material/CalendarToday';
import SyncIcon from '@mui/icons-material/Autorenew';
import { IconCounter } from '../components/IconCounter/IconCounter.tsx';
import Timer from '../components/Timer/Timer.jsx';
import { useNavigate } from 'react-router-dom';
import PlayTab from './PlayTab';
import LeaderboardTab from './LeaderboardTab';
import GameState from './GameState';

export default function RushDefaultState({
  isStarted = false,
  loading = false,
  correctPuzzles = [],
  countdownRef,
  setShowResults,
  setIsStarted,
  showCountdown,
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [mainTab, setMainTab] = useState<'play' | 'leaderboard'>('play');
  const [boardTab, setBoardTab] = useState<'global' | 'friends' | 'personal'>('global');

  const [range, setRange] = useState<'daily' | 'weekly' | 'all'>('all');

  const handleMainTab = (_: any, v: string) => setMainTab(v as any);
  const handleBoardTab = (_: any, v: string) => setBoardTab(v as any);
  const handleRange = (e: SelectChangeEvent) => setRange(e.target.value as any);

  const times = createTimes(t);

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
          <Typography variant="h6">--</Typography>
          <Typography variant="caption" sx={{ textTransform: 'uppercase' }}>
            {t('rush.bestToday')}
          </Typography>
        </Stack>
        <Stack alignItems="center">
          <SyncIcon sx={{ color: theme.palette.text.secondary }} />
          <Typography variant="h6">--</Typography>
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
            <PlayTab loading={loading} onStart={handleStart} />
          )}

          {mainTab === 'leaderboard' && (
            <>
              {/* Sub-tabs */}
              <Tabs
                value={boardTab}
                onChange={handleBoardTab}
                textColor="primary"
                indicatorColor="primary"
                sx={{ mt: 1 }}
              >
                <Tab label={t('rush.globalTab')} value="global" />
                <Tab label={t('rush.friendsTab')} value="friends" />
                <Tab label={t('rush.personalTab')} value="personal" />
              </Tabs>

              {/* Period select */}
              <FormControl
                size="small"
                sx={{
                  mt: 1,
                  mb: 1,
                  minWidth: 120,
                  '& .MuiInputLabel-root': {
                    color: theme.palette.text.secondary,
                  },
                  '& .MuiSelect-icon': {
                    color: theme.palette.text.secondary,
                  },
                }}
              >
                <InputLabel>{t('rush.range.all')}</InputLabel>
                <Select value={range} label={t('rush.range.all')} onChange={handleRange}>
                  <MenuItem value="daily">{t('rush.range.daily')}</MenuItem>
                  <MenuItem value="weekly">{t('rush.range.weekly')}</MenuItem>
                  <MenuItem value="all">{t('rush.range.all')}</MenuItem>
                </Select>
              </FormControl>

              {/* Leaderboard list */}
              <Paper
                variant="outlined"
                sx={{
                  bgcolor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: 2,
                  maxHeight: 350,
                  overflowY: 'auto',
                }}
              >
                {mockPlayers
                  .filter((_, i) => {
                    if (boardTab === 'friends') return i % 2 === 0;
                    if (boardTab === 'personal') return i < 5;
                    return true;
                  })
                  .map((p) => (
                    <Stack
                      key={p.rank}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      px={2}
                      py={1}
                      sx={{
                        '&:nth-of-type(odd)': {
                          bgcolor: theme.palette.action.hover,
                        },
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography sx={{ width: 24 }}>#{p.rank}</Typography>
                        <Avatar src={p.avatarUrl} sx={{ width: 32, height: 32 }} />
                        {p.title && (
                          <Box
                            sx={{
                              fontSize: 12,
                              px: 0.5,
                              py: 0.2,
                              border: `1px solid ${theme.palette.divider}`,
                              borderRadius: '4px',
                            }}
                          >
                            {t(p.titleKey)}
                          </Box>
                        )}
                        <Typography
                          sx={{
                            color: theme.palette.primary.main,
                            fontWeight: 500,
                          }}
                        >
                          {p.username}
                        </Typography>
                        <Box component="span">{p.flag}</Box>
                        {p.badges?.map((b, i) => (
                          <Box key={i} component="span" sx={{ ml: 0.5 }}>
                            {b}
                          </Box>
                        ))}
                      </Stack>
                      <Typography sx={{ fontWeight: 600 }}>{p.score}</Typography>
                    </Stack>
                  ))}
              </Paper>
            </>
          )}
        </>
      )}
    </Box>
  );
}

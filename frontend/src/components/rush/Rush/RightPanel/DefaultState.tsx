import React, { useRef, useState, useEffect } from 'react';

import {
  Box,
  Stack,
  IconButton,
  Typography,
  Tabs,
  Tab,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useTranslation } from 'react-i18next';
import LeaderboardTab from '../components/LeaderboardTab/LeaderboardTab.tsx';

import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ExtensionIcon from '@mui/icons-material/Extension';
import WbSunnyIcon from '@mui/icons-material/CalendarToday';
import SyncIcon from '@mui/icons-material/Autorenew';
import PlayTab from './PlayTab';
import GameState from './GameState';
import axios from 'axios';
import { API_BASE } from '@api/api';

import { Icon } from '@iconify/react';
import chessIcon from '@iconify-icons/mdi/chess-queen'; // или другой
import { useSearchParams, useNavigate } from 'react-router-dom';

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
  const [themes, setThemes] = useState<string[]>([]);
  const [mainTab, setMainTab] = useState<'play' | 'leaderboard'>('play');
  const [searchParams, setSearchParams] = useSearchParams();

  const queryTheme = searchParams.get('theme') || '';
  const [selectedTheme, setSelectedTheme] = useState(queryTheme);
  const handleMainTab = (_: any, v: string) => setMainTab(v as any);

  const queryRating = parseInt(searchParams.get('rating') || '0', 10);
  const [startRating, setStartRating] = useState(queryRating);

  const handleThemeChange = (newTheme: string) => {
    setSelectedTheme(newTheme);

    const params = new URLSearchParams(searchParams);
    if (newTheme === '') {
      params.delete('theme'); // если "any", то убираем параметр
    } else {
      params.set('theme', newTheme);
    }
    setSearchParams(params);
  };

  const handleRatingChange = (newRating: number) => {
    setStartRating(newRating);

    const params = new URLSearchParams(searchParams);
    if (newRating === 0) {
      params.delete('rating');
    } else {
      params.set('rating', String(newRating));
    }
    setSearchParams(params);
  };

  useEffect(() => {
    axios
      .get(`${API_BASE}/puzzles/themes`) // ← роут, который ты добавишь ниже
      .then((res) => {
        const fetchedThemes = res.data.map((t: any) => t.name);
        setThemes(fetchedThemes); // ← только реальные темы
      })
      .catch((err) => console.error('Failed to load themes', err));
  }, []);
  // const themeOptions = [t('rush.anyTheme'), ...themes];

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
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ my: 2 }}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="theme-select-label">
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                      <Icon icon={chessIcon} width={18} height={18} style={{ marginRight: 6 }} />
                      {t('rush.selectTheme')}
                    </Box>
                  </InputLabel>
                  <Select
                    labelId="theme-select-label"
                    value={selectedTheme}
                    onChange={(e) => handleThemeChange(e.target.value)}
                    label={t('rush.selectTheme')}
                  >
                    <MenuItem value="">{t('rush.anyTheme')}</MenuItem>
                    {themes.map((theme) => (
                      <MenuItem key={theme} value={theme}>
                        {theme}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ width: 250 }} variant="outlined" size="small">
                  <InputLabel id="rating-select-label">
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                      <TrendingUpIcon sx={{ mr: 1 }} />
                      {t('rush.selectRating')}
                    </Box>
                  </InputLabel>
                  <Select
                    labelId="rating-select-label"
                    value={startRating}
                    onChange={(e) => handleRatingChange(Number(e.target.value))}
                    label={t('rush.selectRating')}
                    startAdornment={<TrendingUpIcon sx={{ mr: 1, color: 'action.active' }} />}
                  >
                    <MenuItem value={0}>{t('rush.anyRating')}</MenuItem>
                    {[1500, 2000, 2500].map((r) => (
                      <MenuItem key={r} value={r}>
                        {r}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <PlayTab
                loading={loading}
                setRushModeCounter={setRushModeCounter}
                setMode={setMode}
                onStart={handleStart}
              />
            </>
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

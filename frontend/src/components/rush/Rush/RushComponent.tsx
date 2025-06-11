import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Stack,
  Avatar,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ExtensionIcon from '@mui/icons-material/Extension';
import WbSunnyIcon from '@mui/icons-material/CalendarToday';
import SyncIcon from '@mui/icons-material/Autorenew';
import { useNavigate } from 'react-router-dom';

interface Player {
  rank: number;
  title?: string;
  username: string;
  flag: string;
  avatarUrl?: string;
  badges?: string[];
  score: number;
}

const mockPlayers: Player[] = [
  { rank: 1, title: 'GM', username: 'Msb2', flag: '🇩🇪', badges: ['💎'], score: 93 },
  { rank: 2, username: 'Sarvesh1300', flag: '🇺🇸', score: 80 },
  { rank: 3, username: 'jt898989', flag: '🇵🇭', badges: ['♕'], score: 80 },
  { rank: 4, username: 'lixifan', flag: '🇨🇳', badges: ['♕', '💎'], score: 80 },
  { rank: 5, username: 'snr1024', flag: '🇨🇳', score: 80 },
  { rank: 6, title: 'FM', username: 'tepcovua2007', flag: '🇻🇳', badges: ['💎'], score: 79 },
  { rank: 7, title: 'FM', username: 'McQueen444', flag: '🇺🇸', badges: ['♕'], score: 79 },
  { rank: 8, title: 'IM', username: 'PawnPromotes', flag: '🇪🇸', badges: ['♕'], score: 79 },
  { rank: 9, username: 'MahsaWitreko', flag: '🇺🇦', badges: ['🍌'], score: 79 },
  { rank: 10, title: '★', username: 'TD9', flag: '🇹🇷', badges: ['⭐'], score: 78 },
];

export default function PuzzleRush() {
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<'play' | 'leaderboard'>('leaderboard');
  const [boardTab, setBoardTab] = useState<'global' | 'friends' | 'personal'>('global');
  const [range, setRange] = useState<'daily' | 'weekly' | 'all'>('all');

  const handleMainTab = (_: any, v: string) => setMainTab(v as any);
  const handleBoardTab = (_: any, v: string) => setBoardTab(v as any);
  const handleRange = (e: SelectChangeEvent) => setRange(e.target.value as any);

  return (
    <Box
      sx={{
        bgcolor: '#f5f5f5',
        color: '#333',
        borderRadius: 2,
        maxWidth: 600,
        mx: 'auto',
        p: 2,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* BACK BUTTON + TITLE */}
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <IconButton size="small" onClick={() => navigate('/')}>
          <ArrowBackIosNewIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Puzzle Rush
          </Typography>
        </Box>
        <Box sx={{ width: 40 }} />
      </Stack>

      {/* Puzzle icon */}
      <Box sx={{ textAlign: 'center', my: 1 }}>
        <ExtensionIcon sx={{ fontSize: 48, color: '#fb8c00' }} />
      </Box>

      {/* Top stats */}
      <Stack direction="row" justifyContent="space-around" mb={1}>
        <Stack alignItems="center">
          <WbSunnyIcon />
          <Typography variant="h6">--</Typography>
          <Typography variant="caption" sx={{ textTransform: 'uppercase' }}>
            Best Today
          </Typography>
        </Stack>
        <Stack alignItems="center">
          <SyncIcon />
          <Typography variant="h6">--</Typography>
          <Typography variant="caption" sx={{ textTransform: 'uppercase' }}>
            Top Score
          </Typography>
        </Stack>
      </Stack>

      {/* Main tabs */}
      <Tabs
        value={mainTab}
        onChange={handleMainTab}
        textColor="primary"
        indicatorColor="primary"
        sx={{ mb: 1 }}
      >
        <Tab label="Play" value="play" />
        <Tab label="Leaderboard" value="leaderboard" />
      </Tabs>

      {mainTab === 'play' && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button variant="contained" size="large" color="primary">
            Start Puzzle Rush
          </Button>
        </Box>
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
            <Tab label="Global" value="global" />
            <Tab label="Friends" value="friends" />
            <Tab label="Personal" value="personal" />
          </Tabs>

          {/* Period select */}
          <FormControl size="small" sx={{ mt: 1, mb: 1, minWidth: 120 }}>
            <InputLabel>All</InputLabel>
            <Select value={range} label="All" onChange={handleRange}>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="all">All</MenuItem>
            </Select>
          </FormControl>

          {/* Leaderboard list */}
          <Paper
            variant="outlined"
            sx={{
              bgcolor: '#fff',
              borderColor: '#ddd',
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
                    '&:nth-of-type(odd)': { bgcolor: '#fafafa' },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ width: 24 }}>#{p.rank}</Typography>
                    <Avatar src={p.avatarUrl} sx={{ width: 32, height: 32, bgcolor: '#ccc' }} />
                    {p.title && (
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 0.5,
                          py: 0.2,
                          border: '1px solid #aaa',
                          borderRadius: '4px',
                        }}
                      >
                        {p.title}
                      </Box>
                    )}
                    <Typography sx={{ color: '#1976d2', fontWeight: 500 }}>{p.username}</Typography>
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
    </Box>
  );
}

// src/components/LeaderboardTab.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Stack,
  Typography,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  SelectChangeEvent,
} from '@mui/material';
import { API_BASE } from '@api/api';

export interface Player {
  rank: number;
  lichessId: string;
  score: number;
}

interface LeaderboardTabProps {
  token: string;
}

const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ token }) => {
  const theme = useTheme();

  const [range, setRange] = useState<'daily' | 'weekly' | 'all'>('all');
  const [mode, setMode] = useState<'3m' | '5m' | 'survival'>('3m');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    axios
      .get<Player[]>(`${API_BASE}/leaderboard?range=${range}&mode=${mode}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((resp) => setPlayers(resp.data))
      .catch((err) => {
        console.error('Failed to load leaderboard', err);
        setError('Не удалось загрузить таблицу лидеров');
      })
      .finally(() => setLoading(false));
  }, [range, mode, token]);

  const onRangeChange = (e: SelectChangeEvent) => {
    setRange(e.target.value as any);
  };
  const onModeChange = (e: SelectChangeEvent) => {
    setMode(e.target.value as any);
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={2}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Range</InputLabel>
          <Select value={range} label="Range" onChange={onRangeChange}>
            <MenuItem value="daily">Daily</MenuItem>
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="all">All Time</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Mode</InputLabel>
          <Select value={mode} label="Mode" onChange={onModeChange}>
            <MenuItem value="3m">3 Minutes</MenuItem>
            <MenuItem value="5m">5 Minutes</MenuItem>
            <MenuItem value="survival">Survival</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" align="center" sx={{ py: 4 }}>
          {error}
        </Typography>
      ) : (
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
          {players.map((p) => (
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
              <Typography sx={{ width: 24 }}>#{p.rank}</Typography>
              <Typography
                sx={{
                  flexGrow: 1,
                  ml: 1,
                  color: theme.palette.primary.main,
                  fontWeight: 500,
                }}
              >
                {p.lichessId}
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>{p.score}</Typography>
            </Stack>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default LeaderboardTab;

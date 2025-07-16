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
import WbSunnyIcon from '@mui/icons-material/CalendarToday';
import SyncIcon from '@mui/icons-material/Autorenew';

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
  const [range, setRange] = useState<'daily' | 'all'>('all');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    axios
      .get<Player[]>(`http://localhost:5000/leaderboard?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((resp) => setPlayers(resp.data))
      .catch((err) => {
        console.error('Failed to load leaderboard', err);
        setError('Не удалось загрузить таблицу лидеров');
      })
      .finally(() => setLoading(false));
  }, [range, token]);

  const handleRangeChange = (e: SelectChangeEvent<'daily' | 'all'>) => {
    setRange(e.target.value as 'daily' | 'all');
  };

  return (
    <Box>
      <FormControl size="small" sx={{ mb: 2, minWidth: 120 }}>
        <InputLabel id="lb-range-label">Range</InputLabel>
        <Select labelId="lb-range-label" value={range} label="Range" onChange={handleRangeChange}>
          <MenuItem value="daily">Daily</MenuItem>
          <MenuItem value="all">All Time</MenuItem>
        </Select>
      </FormControl>

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

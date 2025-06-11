import React from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  useTheme,
  Divider,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { useNavigate, useParams } from 'react-router-dom';

interface PlayerResult {
  place: number;
  slug: string;
  username: string;
  flag: string;
  scores: number[];
  points: number;
  time: number;
}

const mockRound = {
  players: [5, 5],
  status: 'Completed',
  description: 'Mate in 2',
};

const mockResults: PlayerResult[] = [
  {
    place: 1,
    slug: 'endspiel-610',
    username: 'PacoMcasi',
    flag: '🇧🇬',
    scores: [29, 27, 27, 26, 19],
    points: 128,
    time: 538,
  },
  {
    place: 2,
    slug: 'mofg-124',
    username: 'MOFG',
    flag: '🇲🇽',
    scores: [26, 28, 27, 22, 21],
    points: 124,
    time: 538,
  },
];

export default function TournamentResults() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2, fontFamily: 'Arial, sans-serif' }}>
      {/* Green Header */}
      <Box
        sx={{
          bgcolor: 'success.main',
          color: 'common.white',
          borderRadius: 1,
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EmojiEventsIcon sx={{ mr: 1 }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Puzzle Tournaments
        </Typography>
      </Box>

      {/* Full-width Back Button */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <Button
          fullWidth
          startIcon={<ArrowBackIosNewIcon />}
          onClick={() => navigate('/rush/tournaments')}
          variant="outlined"
        >
          BACK TO TOURNAMENTS
        </Button>
      </Box>

      {/* Round Bar */}
      {/* Round / status bar */}
      <Box
        sx={{
          bgcolor: 'common.white', // white background
          px: 2,
          py: 1,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          boxShadow: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.dark' }}>
            Round:
          </Typography>

          {/* green-filled chip */}
          <Chip
            label="5 vs 5"
            size="small"
            sx={{
              bgcolor: 'success.main',
              color: 'common.white',
              fontWeight: 600,
            }}
          />

          {/* green-outlined chip */}
          <Chip
            label="Completed"
            size="small"
            variant="outlined"
            sx={{
              borderColor: 'success.main',
              color: 'success.main',
              fontWeight: 600,
            }}
          />
        </Box>

        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.dark' }}>
          Mate in 2
        </Typography>
      </Box>

      <Divider />

      {/* Results Table */}
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell>Place</TableCell>
              <TableCell>Player</TableCell>
              {[1, 2, 3, 4, 5].map((n) => (
                <TableCell key={n} align="right">
                  {n}
                </TableCell>
              ))}
              <TableCell align="right">Points</TableCell>
              <TableCell align="right">Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockResults.map((r) => (
              <TableRow
                key={r.slug}
                hover
                sx={{
                  '&:nth-of-type(odd)': { bgcolor: 'grey.50' },
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/rush/tournaments/${r.slug}`)}
              >
                <TableCell>#{r.place}</TableCell>
                <TableCell>
                  <Typography component="span" sx={{ fontWeight: 600, mr: 1 }}>
                    {r.username}
                  </Typography>
                  <span>{r.flag}</span>
                </TableCell>
                {r.scores.map((s, i) => (
                  <TableCell key={i} align="right">
                    {s}
                  </TableCell>
                ))}
                <TableCell align="right">{r.points}</TableCell>
                <TableCell align="right">{r.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

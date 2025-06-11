import React, { useState } from 'react';
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
  Card,
  CardActionArea,
  CardContent,
  Stack,
  useTheme,
  Divider,
  IconButton,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Icon } from '@iconify/react';
import chessIcon from '@iconify-icons/twemoji/jigsaw'; // colored jigsaw puzzle
import flagIcon from '@iconify-icons/emojione-v3/flag-for-flag-bg'; // Bulgaria placeholder
import { useNavigate } from 'react-router-dom';

interface Tournament {
  id: number;
  slug: string;
  title: string;
  playersCount: number;
  status: 'active' | 'upcoming';
  roundInfo?: string;
  countdown?: string;
  startDate: string;
  startTime: string;
  description: string;
}

const mockToday: Tournament[] = [
  {
    id: 1,
    slug: 'endspiel-610',
    title: 'Эндшпиль',
    playersCount: 1,
    status: 'active',
    roundInfo: '6/10',
    startDate: '11 июня',
    startTime: '11:54',
    description: 'С ладьями',
  },
  {
    id: 2,
    slug: 'smeshariki-1700-1900',
    title: 'Смешарики – Эндшпиль',
    playersCount: 1,
    status: 'upcoming',
    countdown: '4ч 13м',
    startDate: '11 июня',
    startTime: '17:00',
    description: 'С ладьями',
  },
];

export default function TournamentList() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'today' | 'my'>('today');
  const data = mockToday; // for brevity

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 2, fontFamily: 'Roboto, sans-serif' }}>
      {/* HEADER */}
      <Box
        sx={{
          width: '100%',
          bgcolor: 'success.main',
          color: 'common.white',
          px: 3,
          py: 1.5,
          mb: 3,
          borderRadius: 2,
          boxShadow: 2,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Back arrow, positioned absolutely */}
        <IconButton
          size="large"
          onClick={() => navigate('/')}
          sx={{
            position: 'absolute',
            left: 16,
            color: 'white',
          }}
        >
          <ArrowBackIosNewIcon fontSize="inherit" />
        </IconButton>

        {/* Centered title with a colored puzzle icon */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <Icon icon={chessIcon} width={32} height={32} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Турниры
          </Typography>
        </Stack>
      </Box>

      {/* TABS & CREATE */}
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Button
          onClick={() => setTab('today')}
          variant={tab === 'today' ? 'contained' : 'text'}
          sx={{
            textTransform: 'none',
            fontWeight: tab === 'today' ? 700 : 500,
            mr: 1,
          }}
        >
          Сегодня
        </Button>
        <Button
          onClick={() => setTab('my')}
          variant={tab === 'my' ? 'contained' : 'text'}
          sx={{ textTransform: 'none', fontWeight: tab === 'my' ? 700 : 500, mr: 'auto' }}
        >
          Мои турниры
        </Button>
        <Button
          variant="contained"
          sx={{
            bgcolor: theme.palette.success.main,
            color: 'white',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: theme.palette.success.dark },
          }}
        >
          Создать турнир
        </Button>
      </Stack>

      {/* LIST */}
      <Stack spacing={2}>
        {data.map((t) => (
          <Card
            key={t.id}
            component={CardActionArea}
            onClick={() => navigate(`/rush/tournaments/${t.slug}`)}
            sx={{
              boxShadow: 1,
              '&:hover': { boxShadow: 4 },
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                {/* puzzle icon */}
                <Icon icon={chessIcon} width={32} height={32} />

                {/* title */}
                <Typography sx={{ fontWeight: 600 }}>{t.title}</Typography>

                {/* spacer */}
                <Box sx={{ flexGrow: 1 }} />

                {/* status chip */}
                <Chip
                  label={t.status === 'active' ? 'Идёт' : 'Скоро'}
                  size="small"
                  color={t.status === 'active' ? 'success' : 'warning'}
                />
              </Stack>

              <Divider sx={{ my: 1 }} />

              <Stack direction="row" alignItems="center" spacing={3}>
                {/* players */}
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <PeopleIcon sx={{ color: theme.palette.primary.main }} />
                  <Typography>{t.playersCount}</Typography>
                </Stack>

                {/* round or countdown */}
                {t.roundInfo ? (
                  <Typography sx={{ fontWeight: 500 }}>Раунд: {t.roundInfo}</Typography>
                ) : (
                  <Typography sx={{ fontWeight: 500 }}>
                    <AccessTimeIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} fontSize="small" />
                    {t.countdown}
                  </Typography>
                )}

                {/* date */}
                <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarTodayIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} fontSize="small" />
                  {t.startDate}, {t.startTime}
                </Typography>

                {/* description */}
                <Typography sx={{ fontWeight: 600, color: theme.palette.primary.dark }}>
                  {t.description}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}

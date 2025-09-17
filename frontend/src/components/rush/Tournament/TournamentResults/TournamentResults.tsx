// src/components/rush/Tournament/TournamentDetails.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  Button,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TimerIcon from '@mui/icons-material/Timer';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext.tsx';
import { API_BASE } from '@api/api';

interface Participant {
  user_id: number;
  user_name: string;
  joined_at: string;
}

interface ApiTournamentDetails {
  id: number;
  slug: string;
  title: string;
  description: string;
  status: 'active' | 'upcoming';
  isStarted: boolean;
  isOver: boolean;
  currentRound: number;
  maxRounds: number;
  startAt: string; // ISO
  nextRoundAt: string | null; // ISO | null
  roundGapSec: number;
  puzzlesPerRound: number;
  timePerPuzzleSec: number;
  participantsCount: number;
  ownerId: number | null;
  ownerName: string | null;
  leagueId: string | null;
  leagueName: string | null;
  isParticipant: boolean;
  participants: Participant[];
}

function formatDate(iso?: string | null, tz?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  }).format(d);
}

function formatCountdown(targetIso?: string | null): string {
  if (!targetIso) return '';
  const target = new Date(targetIso).getTime();
  const now = Date.now();
  let diff = Math.max(0, target - now);
  const h = Math.floor(diff / 3600000);
  diff -= h * 3600000;
  const m = Math.floor(diff / 60000);
  diff -= m * 60000;
  const s = Math.floor(diff / 1000);
  if (h > 0) return `${h}ч ${m}м ${s.toString().padStart(2, '0')}с`;
  return `${m}м ${s.toString().padStart(2, '0')}с`;
}

export default function TournamentDetails() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { token } = useAuth(); // ← источник Bearer

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [t, setT] = useState<ApiTournamentDetails | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await axios.get<ApiTournamentDetails>(
        `${API_BASE}/tournaments/${encodeURIComponent(slug)}`,
        {
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          withCredentials: true,
        },
      );
      setT(data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [slug, token]);

  useEffect(() => {
    if (slug) refresh();
  }, [slug, refresh]);

  // Обновляем таймер раз в секунду
  useEffect(() => {
    if (!t) return;
    const target = t.isStarted ? t.nextRoundAt : t.startAt;
    if (!target) return;
    setCountdown(formatCountdown(target));
    const id = setInterval(() => setCountdown(formatCountdown(target)), 1000);
    return () => clearInterval(id);
  }, [t]);

  const handleJoin = useCallback(async () => {
    if (!t) return;
    if (!token) {
      navigate('/login');
      return;
    }
    setJoining(true);
    setErr(null);
    try {
      const { data } = await axios.post(
        `${API_BASE}/tournaments/${encodeURIComponent(t.slug)}/join`,
        {},
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        },
      );
      if (!data?.ok) throw new Error(data?.error || 'Ошибка вступления');
      await refresh();
    } catch (e: any) {
      if (e?.response?.status === 401) {
        navigate('/login');
        return;
      }
      setErr(e?.response?.data?.error || e?.message || 'Не удалось вступить');
    } finally {
      setJoining(false);
    }
  }, [t, token, navigate, refresh]);

  const handleLeave = useCallback(async () => {
    if (!t) return;
    if (!token) {
      navigate('/login');
      return;
    }
    setLeaving(true);
    setErr(null);
    try {
      const { data } = await axios.post(
        `${API_BASE}/tournaments/${encodeURIComponent(t.slug)}/leave`,
        {},
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        },
      );
      if (!data?.ok) throw new Error(data?.error || 'Ошибка выхода');
      await refresh();
    } catch (e: any) {
      if (e?.response?.status === 401) {
        navigate('/login');
        return;
      }
      setErr(e?.response?.data?.error || e?.message || 'Не удалось выйти');
    } finally {
      setLeaving(false);
    }
  }, [t, token, navigate, refresh]);

  if (loading)
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
        <CircularProgress />
      </Box>
    );

  if (err)
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
        <Button startIcon={<ArrowBackIosNewIcon />} onClick={() => navigate(-1)}>
          Назад
        </Button>
        <Alert severity="error" sx={{ mt: 2 }}>
          {err}
        </Alert>
      </Box>
    );

  if (!t) return null;

  const statusChip =
    t.status === 'active' ? (
      <Chip color="success" label="Идёт" size="small" />
    ) : t.isOver ? (
      <Chip color="default" label="Завершён" size="small" />
    ) : (
      <Chip color="warning" label="Скоро" size="small" />
    );

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIosNewIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>
          {t.title}
        </Typography>
        <Box flexGrow={1} />
        {statusChip}
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
          <Stack direction="row" spacing={1} alignItems="center">
            <PeopleIcon />
            <Typography>{t.participantsCount}</Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarTodayIcon />
            <Typography>{formatDate(t.startAt)}</Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <TimerIcon />
            <Typography>
              {t.isStarted && !t.isOver ? (
                t.currentRound < t.maxRounds ? (
                  <>
                    След. раунд через: <b>{countdown}</b>
                  </>
                ) : (
                  'Последний раунд'
                )
              ) : (
                <>
                  Старт через: <b>{countdown}</b>
                </>
              )}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <SportsEsportsIcon />
            <Typography>
              Раундов: {t.maxRounds} • Пазлов/раунд: {t.puzzlesPerRound} • {t.timePerPuzzleSec}
              s/пазл
            </Typography>
          </Stack>

          {!!t.leagueId && t.leagueId !== 'noleague' && (
            <Stack direction="row" spacing={1} alignItems="center">
              <EmojiEventsIcon />
              <Typography>Лига: {t.leagueName}</Typography>
            </Stack>
          )}

          <Box flexGrow={1} />

          {!t.isOver &&
            (t.isParticipant ? (
              <Button
                variant="outlined"
                color="error"
                onClick={handleLeave}
                disabled={leaving || joining}
              >
                {leaving ? 'Выходим…' : 'Выйти'}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleJoin} disabled={joining || leaving}>
                {joining ? 'Входим…' : 'Войти'}
              </Button>
            ))}
        </Stack>

        {t.isStarted && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Раунд:{' '}
            <b>
              {t.currentRound}/{t.maxRounds}
            </b>
          </Typography>
        )}

        {t.description && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Тематика: {t.description}
            </Typography>
          </>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <PeopleIcon />
          <Typography variant="h6">Участники</Typography>
          <Typography variant="body2" color="text.secondary">
            ({t.participantsCount})
          </Typography>
        </Stack>
        {t.participants.length === 0 ? (
          <Typography color="text.secondary">Пока никто не вступил.</Typography>
        ) : (
          <List dense>
            {t.participants.map((p) => (
              <ListItem key={`${p.user_id}-${p.joined_at}`} disableGutters>
                <ListItemAvatar>
                  <Avatar>
                    {String(p.user_name || 'U')
                      .slice(0, 1)
                      .toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={p.user_name}
                  secondary={new Date(p.joined_at).toLocaleString('ru-RU')}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}

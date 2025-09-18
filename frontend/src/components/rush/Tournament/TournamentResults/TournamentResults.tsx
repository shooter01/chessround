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
import EmojiEvents from '@mui/icons-material/EmojiEvents';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext.tsx';
import { API_BASE } from '@api/api';
import LeaderboardTable, { LeaderboardRow } from '../LeaderboardTable';

interface Participant {
  user_id: string | number;
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

interface ApiLeaderboardRow {
  user_id: string | number;
  user_name: string;
  total_points: number;
  time_spent_sec: number;
  // round_points_1..N
  [k: `round_points_${number}`]: number | null | undefined;
}

interface ApiLeaderboardResponse {
  maxRounds: number;
  currentRound: number;
  isOver: boolean;
  rows: ApiLeaderboardRow[];
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
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [t, setT] = useState<ApiTournamentDetails | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  // leaderboard state
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardErr, setBoardErr] = useState<string | null>(null);
  const [board, setBoard] = useState<{
    maxRounds: number;
    currentRound: number;
    isOver: boolean;
    rows: LeaderboardRow[];
  } | null>(null);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const refreshDetails = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await axios.get<ApiTournamentDetails>(
        `${API_BASE}/tournaments/${encodeURIComponent(slug)}`,
        { headers: { Accept: 'application/json', ...authHeaders }, withCredentials: true },
      );
      setT(data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [slug, token]);

  const refreshBoard = useCallback(async () => {
    setBoardLoading(true);
    setBoardErr(null);
    try {
      console.debug('[Leaderboard] GET', `${API_BASE}/tournaments/${slug}/leaderboard`);
      const { data } = await axios.get<ApiLeaderboardResponse>(
        `${API_BASE}/tournaments/${encodeURIComponent(slug)}/leaderboard`,
        {
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          withCredentials: true,
        },
      );

      const rows: LeaderboardRow[] = data.rows.map((r) => {
        const rounds: Array<number | null> = [];
        for (let i = 1; i <= data.maxRounds; i++) {
          rounds.push((r as any)[`round_points_${i}`] ?? null);
        }
        return {
          userId: r.user_id,
          userName: r.user_name,
          total: r.total_points,
          timeSec: r.time_spent_sec ?? 0,
          rounds,
        };
      });
      setBoard({
        maxRounds: data.maxRounds,
        currentRound: data.currentRound,
        isOver: data.isOver,
        rows,
      });
    } catch (e: any) {
      setBoardErr(e?.response?.data?.error || e?.message || 'Ошибка загрузки таблицы');
    } finally {
      setBoardLoading(false);
    }
  }, [slug, token]);

  // 1) загрузка деталей
  useEffect(() => {
    if (slug) refreshDetails();
  }, [slug, refreshDetails]);

  // 2) гарантированный вызов /leaderboard на маунт
  useEffect(() => {
    if (slug) refreshBoard();
  }, [slug, refreshBoard]);

  // 3) и сразу после получения деталей (чтобы точно дернулось)
  useEffect(() => {
    if (t) refreshBoard();
  }, [t, refreshBoard]);

  // 4) авто-поллинг пока турнир идёт
  useEffect(() => {
    if (!t || !t.isStarted || t.isOver) return;
    const id = setInterval(() => refreshBoard(), 10000); // каждые 10 сек
    return () => clearInterval(id);
  }, [t?.isStarted, t?.isOver, refreshBoard]);

  // countdown
  useEffect(() => {
    if (!t) return;
    const target = t.isStarted ? t.nextRoundAt : t.startAt;
    if (!target) return;
    setCountdown(formatCountdown(target));
    const id = setInterval(() => setCountdown(formatCountdown(target)), 1000);
    return () => clearInterval(id);
  }, [t]);

  // join/leave
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

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
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
          withCredentials: true,
        },
      );
      if (!data?.ok) throw new Error(data?.error || 'Ошибка вступления');
      await Promise.all([refreshDetails(), refreshBoard()]);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        navigate('/login');
        return;
      }
      setErr(e?.response?.data?.error || e?.message || 'Не удалось вступить');
    } finally {
      setJoining(false);
    }
  }, [t, token, navigate, refreshDetails, refreshBoard]);

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
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
          withCredentials: true,
        },
      );
      if (!data?.ok) throw new Error(data?.error || 'Ошибка выхода');
      await Promise.all([refreshDetails(), refreshBoard()]);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        navigate('/login');
        return;
      }
      setErr(e?.response?.data?.error || e?.message || 'Не удалось выйти');
    } finally {
      setLeaving(false);
    }
  }, [t, token, navigate, refreshDetails, refreshBoard]);

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
      {/* Верхняя панель */}
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

      {/* Блок с информацией */}
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
              <EmojiEvents />
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

      {/* Шапка таблицы как на скрине: зелёная плашка с раундом и статусом */}
      <Paper sx={{ p: 1.2, mb: 1, bgcolor: 'success.main', color: 'common.white' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography fontWeight={700}>
            Раунд:&nbsp;
            <Chip
              size="small"
              variant="filled"
              label={`${Math.min(board?.currentRound ?? t.currentRound, t.maxRounds)} из ${t.maxRounds}`}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700 }}
            />
          </Typography>
          <Chip
            size="small"
            color={t.isOver ? 'error' : t.isStarted ? 'info' : 'warning'}
            label={t.isOver ? 'Завершён' : t.isStarted ? 'Идёт' : 'Скоро'}
            sx={{ ml: 1, color: 'white' }}
          />
        </Stack>
      </Paper>

      {/* Таблица результатов */}
      {boardLoading ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : boardErr ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {boardErr}
        </Alert>
      ) : board ? (
        <LeaderboardTable
          rows={board.rows}
          maxRounds={board.maxRounds}
          currentUserId={user?.id}
          onUserClick={(id) => {
            // сюда можно добавить переход на профиль/страницу игрока
            console.log('click user', id);
          }}
          height={420}
        />
      ) : null}

      {/* Блок «О турнире» как в старом UI */}
      <Box sx={{ color: 'text.secondary', mt: 2 }}>
        <Typography align="center" variant="subtitle2" sx={{ opacity: 0.7, mb: 1 }}>
          О турнире
        </Typography>
        <Typography>Кол-во раундов: {t.maxRounds}</Typography>
        <Typography>Время на раунд: {t.roundGapSec} сек.</Typography>
        <Typography>Начало: {formatDate(t.startAt)}</Typography>
        <Typography>Тема: {t.description || '—'}</Typography>
        <Typography>Пазлов в раунде: {t.puzzlesPerRound}</Typography>
        <Typography>
          Секунд на пазл: {t.timePerPuzzleSec === 0 ? 'unlimit' : t.timePerPuzzleSec}
        </Typography>
      </Box>

      {/* Участники (если хочешь оставить как было) */}
      <Paper sx={{ p: 2, mt: 2 }}>
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

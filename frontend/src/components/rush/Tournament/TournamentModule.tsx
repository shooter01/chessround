import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  useTheme,
  Divider,
  IconButton,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Icon } from '@iconify/react';
import chessIcon from '@iconify-icons/twemoji/jigsaw';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '@api/api';
import CreateTournamentDialog, { CreateTournamentResult } from './CreateTournamentDialog';

interface ApiTournament {
  id: number;
  slug: string;
  title: string;
  playersCount: number;
  status: 'active' | 'upcoming';
  roundInfo?: string;
  countdown?: string | null;
  startAt: string;
  nextRoundAt?: string | null;
  description: string;
}

interface TournamentUI {
  id: number;
  slug: string;
  title: string;
  playersCount: number;
  status: 'active' | 'upcoming';
  roundInfo?: string;
  countdownLabel?: string;
  startDate: string;
  startTime: string;
  description: string;
}

type ThemeItem = { id: string | number; title: string };
type LeagueItem = { id: string | number; name: string };

export default function TournamentList() {
  const theme = useTheme();
  const navigate = useNavigate();

  // tabs & data
  const [tab, setTab] = useState<'today' | 'my'>('today');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<TournamentUI[]>([]);

  // modal + reference data
  const [openCreate, setOpenCreate] = useState(false);
  const [themes, setThemes] = useState<ThemeItem[]>([{ id: 'random', title: 'Любая тематика' }]);
  const [leagues, setLeagues] = useState<LeagueItem[]>([{ id: 'noleague', name: 'Без лиги' }]);

  // helpers
  const fmtDate = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: 'long',
      timeZone: 'Europe/Stockholm',
    }).format(d);
  };

  const fmtTime = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Stockholm',
    }).format(d);
  };

  const fmtCountdown = (iso?: string | null) => {
    if (!iso) return undefined;
    const target = new Date(iso).getTime();
    const now = Date.now();
    let diff = Math.max(0, target - now);
    const h = Math.floor(diff / 3600000);
    diff -= h * 3600000;
    const m = Math.floor(diff / 60000);
    if (h > 0) return `${h}ч ${m}м`;
    return `${m}м`;
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({ scope: tab });
      const resp = await fetch(`${API_BASE}/tournaments?${qs.toString()}`, {
        credentials: 'include',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: ApiTournament[] = await resp.json();

      const mapped: TournamentUI[] = data.map((t) => ({
        id: t.id,
        slug: t.slug,
        title: t.title,
        playersCount: t.playersCount,
        status: t.status,
        roundInfo: t.roundInfo,
        countdownLabel: t.status === 'upcoming' ? fmtCountdown(t.countdown) : undefined,
        startDate: fmtDate(t.startAt),
        startTime: fmtTime(t.startAt),
        description: t.description,
      }));
      setItems(mapped);
    } catch (e: any) {
      setErr(e.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // подгрузка справочников (если есть API — подставь свои эндпоинты)
  useEffect(() => {
    (async () => {
      try {
        const [th, lg] = await Promise.all([
          fetch(`${API_BASE}/catalog/themes`, { credentials: 'include' }).then((r) =>
            r.ok ? r.json() : [],
          ),
          fetch(`${API_BASE}/catalog/leagues`, { credentials: 'include' }).then((r) =>
            r.ok ? r.json() : [],
          ),
        ]).catch(() => [[], []] as any);

        if (Array.isArray(th) && th.length) setThemes(th);
        if (Array.isArray(lg) && lg.length)
          setLeagues([{ id: 'noleague', name: 'Без лиги' }, ...lg]);
      } catch {
        // остаёмся на дефолтах
      }
    })();
  }, []);

  // onCreated: можно просто обновить список, а можно перейти на созданный турнир
  const handleCreated = useCallback(
    (t: CreateTournamentResult) => {
      setOpenCreate(false);
      loadList();
      navigate(`/rush/tournaments/${t.slug}`);
    },
    [navigate, loadList],
  );

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
        <IconButton
          size="large"
          onClick={() => navigate('/')}
          sx={{ position: 'absolute', left: 16, color: 'white' }}
        >
          <ArrowBackIosNewIcon fontSize="inherit" />
        </IconButton>
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
          sx={{ textTransform: 'none', fontWeight: tab === 'today' ? 700 : 500, mr: 1 }}
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
          onClick={() => setOpenCreate(true)} // <-- ОТКРЫВАЕМ МОДАЛКУ
        >
          Создать турнир
        </Button>
      </Stack>

      {/* STATE */}
      {loading && <Typography sx={{ opacity: 0.7 }}>Загрузка…</Typography>}
      {err && <Typography color="error">Ошибка: {err}</Typography>}
      {!loading && !err && items.length === 0 && (
        <Typography sx={{ opacity: 0.7 }}>Пока ничего нет.</Typography>
      )}

      {/* LIST */}
      <Stack spacing={2}>
        {items.map((t) => (
          <Card
            key={t.id}
            component={CardActionArea}
            onClick={() => navigate(`/rush/tournaments/${t.slug}`)}
            sx={{ boxShadow: 1, '&:hover': { boxShadow: 4 } }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Icon icon={chessIcon} width={32} height={32} />
                <Typography sx={{ fontWeight: 600 }}>{t.title}</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Chip
                  label={t.status === 'active' ? 'Идёт' : 'Скоро'}
                  size="small"
                  color={t.status === 'active' ? 'success' : 'warning'}
                />
              </Stack>

              <Divider sx={{ my: 1 }} />

              <Stack direction="row" alignItems="center" spacing={3} flexWrap="wrap">
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <PeopleIcon sx={{ color: theme.palette.primary.main }} />
                  <Typography>{t.playersCount}</Typography>
                </Stack>

                {t.roundInfo ? (
                  <Typography sx={{ fontWeight: 500 }}>Раунд: {t.roundInfo}</Typography>
                ) : t.countdownLabel ? (
                  <Typography sx={{ fontWeight: 500 }}>
                    <AccessTimeIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} fontSize="small" />
                    {t.countdownLabel}
                  </Typography>
                ) : null}

                <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarTodayIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} fontSize="small" />
                  {t.startDate}, {t.startTime}
                </Typography>

                <Typography sx={{ fontWeight: 600, color: theme.palette.primary.dark }}>
                  {t.description}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* CREATE DIALOG */}
      <CreateTournamentDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={handleCreated}
        themes={themes}
        leagues={leagues}
        defaultThemeId={themes[0]?.id}
        defaultLeagueId={leagues[0]?.id}
      />
    </Box>
  );
}

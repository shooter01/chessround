// src/components/rush/Tournament/CreateTournamentDialog.tsx
import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Typography,
  Slider,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { API_BASE } from '@api/api';

type ThemeItem = { id: string | number; title: string };
type LeagueItem = { id: string | number; name: string };

export interface CreateTournamentResult {
  ok: boolean;
  id: number;
  slug: string;
  startAt: string;
  nextRoundAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (t: CreateTournamentResult) => void;
  themes: ThemeItem[];
  leagues: LeagueItem[];
  defaultThemeId?: string | number;
  defaultLeagueId?: string | number;
}

type StartMode = 'start_in' | 'custom';

const MIN_TITLE = 3;
const MAX_TITLE = 100;
const minutesOptions = [1, 2, 3, 5, 10, 15, 20, 30, 45, 60];

export default function CreateTournamentDialog({
  open,
  onClose,
  onCreated,
  themes,
  leagues,
  defaultLeagueId,
  defaultThemeId,
}: Props) {
  const [title, setTitle] = useState('');
  const [startMode, setStartMode] = useState<StartMode>('start_in');
  const [startInMinutes, setStartInMinutes] = useState<number>(5);
  const [customStart, setCustomStart] = useState<Dayjs | null>(dayjs().add(10, 'minute'));
  const [rounds, setRounds] = useState<number>(5);
  const [puzzlesInRound, setPuzzlesInRound] = useState<number>(10);
  const [themeId, setThemeId] = useState<string | number>(defaultThemeId ?? themes[0]?.id ?? '');
  const [leagueId, setLeagueId] = useState<string | number>(
    defaultLeagueId ?? leagues[0]?.id ?? 'noleague',
  );
  const [withPassword, setWithPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // reset state on close
  useEffect(() => {
    if (!open) {
      setTitle('');
      setStartMode('start_in');
      setStartInMinutes(5);
      setCustomStart(dayjs().add(10, 'minute'));
      setRounds(5);
      setPuzzlesInRound(10);
      setThemeId(defaultThemeId ?? themes[0]?.id ?? '');
      setLeagueId(defaultLeagueId ?? leagues[0]?.id ?? 'noleague');
      setWithPassword(false);
      setPassword('');
      setSubmitting(false);
      setErrorMsg(null);
      setFieldErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const themeName = useMemo(
    () => themes.find((t) => String(t.id) === String(themeId))?.title ?? '',
    [themes, themeId],
  );

  const leagueName = useMemo(
    () =>
      leagues.find((l) => String(l.id) === String(leagueId))?.name ??
      (String(leagueId) === 'noleague' ? 'Без лиги' : ''),
    [leagues, leagueId],
  );

  const isValidTitle = title.trim().length >= MIN_TITLE && title.trim().length <= MAX_TITLE;
  const isValidCustomDate =
    startMode === 'custom'
      ? !!customStart && customStart.isValid() && customStart.isAfter(dayjs())
      : true;

  const canSubmit =
    isValidTitle && isValidCustomDate && (!withPassword || password.length >= 1) && !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setErrorMsg(null);
    setFieldErrors({});

    try {
      const payload = {
        title: title.trim(),
        tournamentPassword: withPassword ? password : '',
        timeBeforeTournamentStartSelector: startInMinutes, // minutes
        flatpickrISOTime: customStart ? customStart.toDate().toISOString() : null,
        time: startMode, // 'start_in' | 'custom'
        max_rounds: rounds,
        puzzles_in_round: puzzlesInRound,
        theme: themeId,
        theme_name: themeName,
        league_id: leagueId || 'noleague',
        league_name: leagueName || (String(leagueId) === 'noleague' ? 'Без лиги' : ''),
      };

      const resp = await fetch(`${API_BASE}/tournaments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        if (resp.status === 422 && json?.errors?.length) {
          const fe: Record<string, string> = {};
          for (const e of json.errors) {
            if (e.field) fe[e.field] = e.msg;
          }
          setFieldErrors(fe);
          setErrorMsg('Исправьте ошибки формы.');
        } else {
          setErrorMsg(json?.error || `Ошибка создания (HTTP ${resp.status})`);
        }
        setSubmitting(false);
        return;
      }

      onCreated?.(json as CreateTournamentResult);
      onClose();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Сетевая ошибка');
      setSubmitting(false);
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Создать турнир</DialogTitle>
        <DialogContent dividers>
          {errorMsg && (
            <Box mb={2}>
              <Alert severity="error">{errorMsg}</Alert>
            </Box>
          )}

          <Box mt={1}>
            <TextField
              label="Название"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              inputProps={{ maxLength: MAX_TITLE }}
              helperText={`${title.length}/${MAX_TITLE}`}
              error={!!fieldErrors.title || !isValidTitle}
              margin="normal"
            />

            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="start-mode-label">Старт</InputLabel>
                  <Select
                    labelId="start-mode-label"
                    label="Старт"
                    value={startMode}
                    onChange={(e) => setStartMode(e.target.value as StartMode)}
                  >
                    <MenuItem value="start_in">Через N минут</MenuItem>
                    <MenuItem value="custom">По дате/времени</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {startMode === 'start_in' ? (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="minutes-label">Минут</InputLabel>
                    <Select
                      labelId="minutes-label"
                      label="Минут"
                      value={startInMinutes}
                      onChange={(e) => setStartInMinutes(Number(e.target.value))}
                    >
                      {minutesOptions.map((m) => (
                        <MenuItem key={m} value={m}>
                          {m}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>Старт через {startInMinutes} мин</FormHelperText>
                  </FormControl>
                </Grid>
              ) : (
                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Дата и время старта"
                    value={customStart}
                    onChange={(v) => setCustomStart(v)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !isValidCustomDate,
                        helperText: !isValidCustomDate ? 'Укажите будущую дату/время' : undefined,
                      },
                    }}
                  />
                </Grid>
              )}
            </Grid>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" gutterBottom>
                  Кол-во раундов: <b>{rounds}</b>
                </Typography>
                <Slider
                  value={rounds}
                  onChange={(_, v) => setRounds(v as number)}
                  step={1}
                  min={1}
                  max={20}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="body2" gutterBottom>
                  Пазлов в раунде: <b>{puzzlesInRound}</b>
                </Typography>
                <Slider
                  value={puzzlesInRound}
                  onChange={(_, v) => setPuzzlesInRound(v as number)}
                  step={1}
                  min={10}
                  max={30}
                />
                <FormHelperText>Каждый раунд ~2 минуты (по умолчанию)</FormHelperText>
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!fieldErrors.theme}>
                  <InputLabel id="theme-label">Тематика</InputLabel>
                  <Select
                    labelId="theme-label"
                    label="Тематика"
                    value={themeId}
                    onChange={(e) => setThemeId(e.target.value)}
                  >
                    {themes.map((t) => (
                      <MenuItem value={t.id} key={t.id}>
                        {t.title}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldErrors.theme && <FormHelperText>{fieldErrors.theme}</FormHelperText>}
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!fieldErrors.league_id}>
                  <InputLabel id="league-label">Лига</InputLabel>
                  <Select
                    labelId="league-label"
                    label="Лига"
                    value={leagueId}
                    onChange={(e) => setLeagueId(e.target.value)}
                  >
                    <MenuItem value="noleague">Без лиги</MenuItem>
                    {leagues.map((l) => (
                      <MenuItem value={l.id} key={l.id}>
                        {l.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldErrors.league_id && (
                    <FormHelperText>{fieldErrors.league_id}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
            </Grid>

            <Box mt={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={withPassword}
                    onChange={(e) => setWithPassword(e.target.checked)}
                  />
                }
                label="Установить пароль для входа"
              />
              {withPassword && (
                <TextField
                  label="Пароль турнира"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  margin="dense"
                  type="text"
                />
              )}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit}
            startIcon={submitting ? <CircularProgress size={18} /> : undefined}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}

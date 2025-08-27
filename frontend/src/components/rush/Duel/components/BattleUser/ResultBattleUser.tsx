import React from 'react';
import { Box, Avatar, Typography, Stack, Link, Tooltip, Paper } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CircleIcon from '@mui/icons-material/Circle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

export interface Effort {
  id: string;
  result: boolean;
}

export interface BattleUserProps {
  userclass: string;
  user_id: string;
  user_name: string;
  errors_array: boolean[];
  player_online: boolean;
  rating: number;
  country?: string; // может быть код страны или URL
  countries: Record<string, string>; // сопоставление кода -> URL флага
  image: string;
  points: number;
  efforts_array: Effort[];
}

export default function ResultBattleUser(props: BattleUserProps) {
  const dense = !!props.dense;

  // 3 индикатора под аватаром
  const underAvatar = Array.from({ length: 3 }, (_, i) => {
    const eff = props.errors_array[i];
    const isError = eff !== undefined && eff === false;
    return (
      <CancelIcon
        key={i}
        sx={{ color: isError ? 'error.main' : 'action.disabled', fontSize: 16 }}
      />
    );
  });

  // поддержка и кода, и прямого URL
  const flagSrc = (props.country && props.countries?.[props.country]) || props.country;

  return (
    <Paper
      variant="outlined"
      elevation={0}
      sx={{
        p: dense ? 1 : 2,
        borderRadius: 2,
        height: '100%',
        textAlign: 'center',
        width: '100%', // растягиваемся
        minWidth: 0,
      }}
    >
      {/* Имя */}
      <Typography variant="subtitle1" fontWeight={700} noWrap>
        <Link
          href={`/users/${props.user_id}`}
          target="_blank"
          rel="noopener noreferrer"
          underline="none"
          sx={{ color: 'primary.main' }}
        >
          {props.user_name}
        </Link>
      </Typography>

      {/* Статус + рейтинг + флаг */}
      <Box display="flex" alignItems="center" justifyContent="center" mt={0.5}>
        {props.player_online ? (
          <Tooltip title="online">
            <CircleIcon sx={{ color: 'success.main', fontSize: 14 }} />
          </Tooltip>
        ) : (
          <Tooltip title="offline">
            <RadioButtonUncheckedIcon sx={{ color: 'text.secondary', fontSize: 14 }} />
          </Tooltip>
        )}
        <Typography variant="body2" sx={{ ml: 0.5 }}>
          ({props.rating})
        </Typography>
        {flagSrc && <Avatar src={flagSrc} alt="flag" sx={{ width: 18, height: 18, ml: 0.5 }} />}
      </Box>

      {/* Аватар */}
      <Box mt={1.5} mb={1} display="flex" justifyContent="center">
        <Avatar
          src={props.image}
          alt={props.user_name}
          variant="rounded"
          sx={{ width: 112, height: 112 }}
        />
      </Box>

      {/* Индикаторы под аватаром */}
      <Stack direction="row" justifyContent="center" spacing={0.75} mb={1}>
        {underAvatar}
      </Stack>

      {/* Очки */}
      <Typography variant="h3" fontWeight={800} lineHeight={1} sx={{ mb: 1, mt: 0.5 }}>
        {props.points}
      </Typography>

      {/* Все попытки: аккуратная сетка */}
      <Box sx={{ mt: dense ? 0.25 : 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(16px, 1fr))',
            justifyItems: 'center',
            alignItems: 'center',
            gap: dense ? '3px' : '6px',
          }}
        >
          {props.efforts_array.map((e, idx) => (
            <Link
              key={idx}
              href={`/puzzles/${e.id}`}
              target="_blank"
              rel="noopener noreferrer"
              underline="none"
              sx={{ lineHeight: 0 }}
              aria-label={`Puzzle ${e.id}`}
            >
              {e.result ? (
                <CheckCircleIcon sx={{ fontSize: dense ? 16 : 20, color: 'success.main' }} />
              ) : (
                <CancelIcon sx={{ fontSize: dense ? 16 : 20, color: 'error.main' }} />
              )}
            </Link>
          ))}
        </Box>
      </Box>
    </Paper>
  );
}

import React from 'react';
import { Box, Grid, Avatar, Typography, Stack, Link, Tooltip } from '@mui/material';
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
  country?: string;
  countries: Record<string, string>;
  image: string;
  points: number;
  efforts_array: Effort[];
}

export default function ResultBattleUser(props: BattleUserProps) {
  // Сформируем ровно три крестика под аватаром
  const underAvatar: JSX.Element[] = [];
  for (let i = 0; i < 3; i++) {
    const eff = props.errors_array[i];
    const isError = eff !== undefined && eff === false;

    underAvatar.push(
      <CancelIcon
        key={i}
        sx={{
          color: isError ? 'error.main' : 'text.disabled',
          fontSize: '1rem',
        }}
      />,
    );
  }

  return (
    <Grid item xs={12} sm={5} md={4}>
      <Box textAlign="center">
        {/* Имя */}
        <Typography variant="subtitle1" fontWeight={600}>
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
              <CircleIcon sx={{ color: 'success.main', fontSize: '0.9rem' }} />
            </Tooltip>
          ) : (
            <Tooltip title="offline">
              <RadioButtonUncheckedIcon sx={{ color: 'text.secondary', fontSize: '0.9rem' }} />
            </Tooltip>
          )}
          <Typography variant="body2" sx={{ ml: 0.5 }}>
            ({props.rating})
          </Typography>
          {props.country && (
            <Avatar
              src={props.country}
              alt={props.country}
              sx={{ width: 18, height: 18, ml: 0.5 }}
            />
          )}
        </Box>

        {/* Аватар */}
        <Box mt={1} mb={1} display="flex" justifyContent="center">
          <Avatar
            src={props.image}
            alt={props.user_name}
            variant="rounded"
            sx={{ width: 100, height: 100 }}
          />
        </Box>

        {/* Первые три крестика под аватаром */}
        <Stack direction="row" justifyContent="center" spacing={0.5} mb={1}>
          {underAvatar}
        </Stack>

        {/* Очки */}
        <Typography variant="h4" fontWeight={700} mb={1}>
          {props.points}
        </Typography>

        {/* Блок всех попыток: фиксированная ширина и wrap */}
        <Box
          sx={{
            width: 200,
            mx: 'auto',
            mt: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              justifyContent: 'center',
            }}
          >
            {props.efforts_array.map((e, idx) => (
              <Link
                key={idx}
                href={`/puzzles/${e.id}`}
                target="_blank"
                rel="noopener noreferrer"
                underline="none"
              >
                {e.result ? (
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 28 }} />
                ) : (
                  <CancelIcon sx={{ color: 'error.main', fontSize: 28 }} />
                )}
              </Link>
            ))}
          </Box>
        </Box>
      </Box>
    </Grid>
  );
}

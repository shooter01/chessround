import React, { useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Avatar,
  SelectChangeEvent,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { mockPlayers } from '../mocks/mock.ts';

export default function LeaderboardTab() {
  const { t } = useTranslation();
  
  const [boardTab, setBoardTab] = useState<'global' | 'friends' | 'personal'>('global');
  const [range, setRange] = useState<'daily' | 'weekly' | 'all'>('all');

  const handleBoardTab = (_: any, v: string) => setBoardTab(v as any);
  const handleRange = (e: SelectChangeEvent) => setRange(e.target.value as any);

  return (
    <>
      {/* Sub-tabs */}
      <Tabs
        value={boardTab}
        onChange={handleBoardTab}
        textColor="primary"
        indicatorColor="primary"
        sx={{ mt: 1 }}
      >
        <Tab label={t('rush.globalTab')} value="global" />
        <Tab label={t('rush.friendsTab')} value="friends" />
        <Tab label={t('rush.personalTab')} value="personal" />
      </Tabs>

      {/* Period select */}
      <FormControl
        size="small"
        sx={{
          mt: 1,
          mb: 1,
          minWidth: 120,
          '& .MuiInputLabel-root': {
            color: 'text.secondary',
          },
          '& .MuiSelect-icon': {
            color: 'text.secondary',
          },
        }}
      >
        <InputLabel>{t('rush.range.all')}</InputLabel>
        <Select value={range} label={t('rush.range.all')} onChange={handleRange}>
          <MenuItem value="daily">{t('rush.range.daily')}</MenuItem>
          <MenuItem value="weekly">{t('rush.range.weekly')}</MenuItem>
          <MenuItem value="all">{t('rush.range.all')}</MenuItem>
        </Select>
      </FormControl>

      {/* Leaderboard list */}
      <Paper
        variant="outlined"
        sx={{
          bgcolor: 'background.paper',
          borderColor: 'divider',
          borderRadius: 2,
          maxHeight: 350,
          overflowY: 'auto',
        }}
      >
        {mockPlayers
          .filter((_, i) => {
            if (boardTab === 'friends') return i % 2 === 0;
            if (boardTab === 'personal') return i < 5;
            return true;
          })
          .map((p) => (
            <Stack
              key={p.rank}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              px={2}
              py={1}
              sx={{
                '&:nth-of-type(odd)': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography sx={{ width: 24 }}>#{p.rank}</Typography>
                <Avatar sx={{ width: 32, height: 32 }} />
                {p.title && (
                  <Box
                    sx={{
                      fontSize: 12,
                      px: 0.5,
                      py: 0.2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '4px',
                    }}
                  >
                    {p.title}
                  </Box>
                )}
                <Typography
                  sx={{
                    color: 'primary.main',
                    fontWeight: 500,
                  }}
                >
                  {p.username}
                </Typography>
                <Box component="span">{p.flag}</Box>
                {p.badges?.map((b, i) => (
                  <Box key={i} component="span" sx={{ ml: 0.5 }}>
                    {b}
                  </Box>
                ))}
              </Stack>
              <Typography sx={{ fontWeight: 600 }}>{p.score}</Typography>
            </Stack>
          ))}
      </Paper>
    </>
  );
} 
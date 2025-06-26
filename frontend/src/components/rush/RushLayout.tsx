// RushLayout.tsx
import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Box, Tabs, Tab, Stack, IconButton, Typography } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ExtensionIcon from '@mui/icons-material/Extension';

interface RushLayoutProps {
  userId: string;
}

const RushLayout: React.FC<RushLayoutProps> = ({ userId }) => {
  const { pathname } = useLocation();

  // Определяем текущее значение таба по URL
  const currentTab = (() => {
    if (pathname.endsWith('/duel')) return '/rush/duel';
    if (pathname.endsWith('/tournaments')) return '/rush/tournaments';
    return '/rush';
  })();

  return (
    <>
      {/* Хидер с кнопкой «назад» и иконкой */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <IconButton component={NavLink} to="/" size="small">
          <ArrowBackIosNewIcon />
        </IconButton>
        <ExtensionIcon sx={{ fontSize: 32 }} />
        <Typography variant="h5">Puzzle Rush</Typography>
      </Stack>

      {/* MUI Tabs */}
      <Tabs value={currentTab} sx={{ mb: 2 }}>
        <Tab
          label="Rush"
          component={NavLink}
          to="/rush"
          value="/rush"
          sx={{ textTransform: 'none' }}
        />
        <Tab
          label="Duel"
          component={NavLink}
          to="/rush/duel"
          value="/rush/duel"
          sx={{ textTransform: 'none' }}
        />
        <Tab
          label="Tournaments"
          component={NavLink}
          to="/rush/tournaments"
          value="/rush/tournaments"
          sx={{ textTransform: 'none' }}
        />
      </Tabs>

      {/* Вложенные маршруты рендерятся здесь */}
      <Outlet />
    </>
  );
};

export default RushLayout;

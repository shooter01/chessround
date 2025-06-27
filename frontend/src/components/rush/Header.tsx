// src/components/rush/Header.tsx

import React, { useState, useContext } from 'react';
import {
  AppBar,
  Container,
  Toolbar as MuiToolbar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Link,
  useTheme,
  alpha,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useTranslation } from 'react-i18next';
import { ColorModeContext } from './context/ColorModeContext';
import Logo from './components/Logo/Logo';
import LanguageSelector from './components/LanguageSelector/LanguageSelector';

// translation keys for menu items
const menuKeys = [
  'menu.play',
  'menu.puzzles',
  'menu.learn',
  'menu.watch',
  'menu.community',
  'menu.tools',
  'menu.donate',
];

export default function TransparentHeaderWithDrawer() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const { toggleColorMode } = useContext(ColorModeContext);
  const { t } = useTranslation();

  const handleDrawerOpen = () => setDrawerOpen(true);
  const handleDrawerClose = () => setDrawerOpen(false);

  const drawerList = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ p: 2 }}>
        <Logo />
      </Box>
      <Divider />
      <List>
        {menuKeys.map((key) => (
          <ListItemButton key={key} component="a" href={`#${key}`}>
            <ListItemText primary={t(key)} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1 }}>
        <IconButton onClick={toggleColorMode} sx={{ color: theme.palette.text.primary }}>
          {theme.palette.mode === 'light' ? (
            <Brightness4Icon fontSize="small" />
          ) : (
            <Brightness7Icon fontSize="small" sx={{ color: '#FFD600' }} />
          )}
        </IconButton>
        <Typography ml={1} sx={{ color: theme.palette.text.primary, mr: 2 }}>
          {theme.palette.mode === 'light' ? t('toggle.dark') : t('toggle.light')}
        </Typography>
        <LanguageSelector />
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: 'blur(10px)',
          backgroundColor: alpha(theme.palette.background.default, 0.3),
          color: theme.palette.text.primary,
        }}
      >
        <Container maxWidth="lg">
          <Toolbar
            disableGutters
            sx={{
              minHeight: { xs: 48, sm: 64 },
              px: { xs: 1, sm: 0 },
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconButton
              edge="start"
              onClick={handleDrawerOpen}
              sx={{ color: 'inherit', mr: 2, display: { xs: 'inline-flex', sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            {/* Logo */}
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-start' }}>
              <Logo />
            </Box>

            {/* Desktop nav */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 3, mr: 2 }}>
              {menuKeys.map((key) => (
                <Link
                  key={key}
                  href={`#${key}`}
                  underline="none"
                  variant="body2"
                  sx={{
                    color: 'inherit',
                    fontWeight: 500,
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {t(key)}
                </Link>
              ))}
            </Box>

            {/* Theme toggle + Language selector */}
            <IconButton onClick={toggleColorMode} sx={{ color: 'inherit' }}>
              {theme.palette.mode === 'light' ? (
                <Brightness4Icon fontSize="small" />
              ) : (
                <Brightness7Icon fontSize="small" sx={{ color: '#FFD600' }} />
              )}
            </IconButton>
            <LanguageSelector />
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={handleDrawerClose}>
        {drawerList}
      </Drawer>

      <MuiToolbar sx={{ minHeight: { xs: 48, sm: 64 } }} />
    </>
  );
}

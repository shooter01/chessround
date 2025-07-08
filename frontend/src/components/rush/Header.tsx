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
  Button,
  Menu,
  MenuItem,
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
import VolumeControl from './components/VolumeControl/VolumeControl';
import PieceSelector from './components/PieceSelector/PieceSelector';
import BoardSelector from './components/BoardSelector/BoardSelector';
import { useAuth } from '../../contexts/AuthContext';

const menuItems = [{ key: 'menu.login', href: `/auth` }];

export default function TransparentHeaderWithDrawer() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const { toggleColorMode } = useContext(ColorModeContext);
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const handleDrawerOpen = () => setDrawerOpen(true);
  const handleDrawerClose = () => setDrawerOpen(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    window.location.href = '/';
  };

  const drawerList = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ p: 2 }}>
        <Logo />
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItemButton key={item.key} component="a" href={item.href} target="_self">
            <ListItemText primary={t(item.key)} />
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
          overflow: 'visible',
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
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              <Logo />
            </Box>

            {/* User or Login */}
            {user ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                <Typography
                  variant="h6"
                  sx={{ cursor: 'pointer', fontWeight: 600, color: theme.palette.text.primary }}
                  onMouseEnter={handleMenuOpen}
                >
                  {user.username}
                </Typography>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                >
                  <MenuItem onClick={handleLogout}>{t('menu.logout')}</MenuItem>
                </Menu>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 2, mr: 2 }}>
                {menuItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    underline="none"
                    variant="body2"
                    target="_self"
                    sx={{
                      color: 'inherit',
                      fontWeight: 500,
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {t(item.key)}
                  </Link>
                ))}
              </Box>
            )}

            <IconButton onClick={toggleColorMode} sx={{ color: 'inherit', mr: 2 }}>
              {theme.palette.mode === 'light' ? (
                <Brightness4Icon fontSize="small" />
              ) : (
                <Brightness7Icon fontSize="small" sx={{ color: '#FFD600' }} />
              )}
            </IconButton>
            <LanguageSelector />
            <VolumeControl />
            <PieceSelector />
            <BoardSelector />
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

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  useTheme,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';

interface Lang {
  code: string;
  label: string;
  flag: string;
}

// Тут перечислите все ваши языки
const LANGS: Lang[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  // …и т.д.
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSwitch = (code: string) => {
    i18n.changeLanguage(code);
    window.localStorage.setItem('app-language', code);
    handleClose();
  };

  const current = LANGS.find((l) => l.code === i18n.language) ?? LANGS[0];

  return (
    <>
      <IconButton
        onClick={handleOpen}
        size="small"
        sx={{
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          px: 1,
        }}
      >
        <LanguageIcon fontSize="small" />
        <Box component="span" sx={{ ml: 0.5, fontWeight: 600 }}>
          {current.code.toUpperCase()}
        </Box>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { maxHeight: 300, width: 200 },
        }}
      >
        {LANGS.map((lang) => (
          <MenuItem
            key={lang.code}
            selected={lang.code === current.code}
            onClick={() => handleSwitch(lang.code)}
            sx={{ py: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Box component="span" sx={{ fontSize: '1.5rem' }}>
                {lang.flag}
              </Box>
            </ListItemIcon>
            <ListItemText>
              <Box sx={{ fontWeight: lang.code === current.code ? 700 : 400 }}>{lang.label}</Box>
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

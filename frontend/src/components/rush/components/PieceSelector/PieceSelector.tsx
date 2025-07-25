import React, { useState, useEffect } from 'react';
import { Box, IconButton, ListItemText, Menu, MenuItem, useTheme } from '@mui/material';
import StyleIcon from '@mui/icons-material/Style';

interface ThemeOption {
  code: string;
  label: string;
}

// Доступные темы для фигур
const THEMES: ThemeOption[] = [
  { code: 'cburnett', label: 'Cburnett' },
  { code: 'classic', label: 'Classic' },
  // { code: 'neo', label: 'Neo' },
  { code: 'alpha', label: 'Alpha' },
  // { code: 'bases', label: 'Bases' },
];

const STORAGE_KEY = 'app-piece-theme';

export default function PieceSelector() {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>(THEMES[0].code);

  // При монтировании читаем сохранённую тему и применяем её
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved && THEMES.some((t) => t.code === saved)) {
      setCurrentTheme(saved);
      applyTheme(saved);
    } else {
      applyTheme(currentTheme);
    }
  }, []);

  const open = Boolean(anchorEl);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Применяет CSS-класс темы к <body>
  const applyTheme = (code: string) => {
    THEMES.forEach((t) => document.body.classList.remove(t.code));

    document.body.classList.add(code);
  };

  // Обработка выбора темы
  const handleSelect = (code: string) => {
    setCurrentTheme(code);
    localStorage.setItem(STORAGE_KEY, code);
    applyTheme(code);
    handleClose();
    window.dispatchEvent(new Event('themechange'));
  };

  const currentLabel = THEMES.find((t) => t.code === currentTheme)?.label ?? '';

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
        <StyleIcon fontSize="small" />
        <Box component="span" sx={{ ml: 0.5, fontWeight: 600 }}>
          {currentLabel}
        </Box>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{ sx: { maxHeight: 300, width: 200 } }}
      >
        {THEMES.map((opt) => (
          <MenuItem
            key={opt.code}
            selected={opt.code === currentTheme}
            onClick={() => handleSelect(opt.code)}
            sx={{ py: 1 }}
          >
            <ListItemText>
              <Box sx={{ fontWeight: opt.code === currentTheme ? 700 : 400 }}>{opt.label}</Box>
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

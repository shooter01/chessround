import React, { useState, useEffect } from 'react';
import { Box, IconButton, ListItemText, Menu, MenuItem, useTheme } from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';

interface BoardOption {
  code: string;
  label: string;
}

// Доступные темы доски
const BOARD_THEMES: BoardOption[] = [
  { code: 'brown', label: 'Brown' },
  { code: 'green', label: 'Green' },
  { code: 'ruby', label: 'Ruby' },
  { code: 'purple', label: 'Purple' },
  { code: 'teal', label: 'Teal' },
];

const STORAGE_KEY = 'app-board-theme';

export default function BoardSelector() {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [current, setCurrent] = useState<string>(BOARD_THEMES[0].code);

  // При монтировании читаем сохранённую тему и применяем её
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && BOARD_THEMES.some((t) => t.code === saved)) {
      setCurrent(saved);
      applyTheme(saved);
    } else {
      applyTheme(current);
    }
  }, []);

  const open = Boolean(anchorEl);
  const currentLabel = BOARD_THEMES.find((t) => t.code === current)?.label ?? '';

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  // Применяем CSS-класс к <body> или корневому элементу
  const applyTheme = (code: string) => {
    BOARD_THEMES.forEach((t) => document.body.classList.remove(t.code));
    document.body.classList.add(code);
  };

  const handleSelect = (code: string) => {
    setCurrent(code);
    localStorage.setItem(STORAGE_KEY, code);
    applyTheme(code);
    handleClose();
    window.dispatchEvent(new Event('boardchange'));
  };

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
        <ViewModuleIcon fontSize="small" />
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
        {BOARD_THEMES.map((opt) => (
          <MenuItem
            key={opt.code}
            selected={opt.code === current}
            onClick={() => handleSelect(opt.code)}
            sx={{ py: 1 }}
          >
            <ListItemText>
              <Box sx={{ fontWeight: opt.code === current ? 700 : 400 }}>{opt.label}</Box>
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

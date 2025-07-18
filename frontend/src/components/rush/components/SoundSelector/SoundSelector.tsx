// src/components/SoundSelector/SoundSelector.tsx
import React, { useState, useEffect } from 'react';
import { Box, IconButton, ListItemText, Menu, MenuItem, useTheme } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

interface SoundOption {
  code: string;
  label: string;
}

const SOUND_OPTIONS: SoundOption[] = [
  { code: 'default', label: 'Default' },
  { code: 'quake3', label: 'Quake 3' },
];

const STORAGE_KEY = 'app-sound-theme';

export default function SoundSelector() {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentSound, setCurrentSound] = useState<string>(SOUND_OPTIONS[0].code);

  // read saved on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SOUND_OPTIONS.some((o) => o.code === saved)) {
      setCurrentSound(saved);
      applySound(saved);
    } else {
      applySound(currentSound);
    }
  }, []);

  const open = Boolean(anchorEl);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  // notify app about change
  const applySound = (code: string) => {
    window.dispatchEvent(new CustomEvent('soundthemechange', { detail: code }));
  };

  const handleSelect = (code: string) => {
    setCurrentSound(code);
    localStorage.setItem(STORAGE_KEY, code);
    applySound(code);
    handleClose();
  };

  const currentLabel = SOUND_OPTIONS.find((o) => o.code === currentSound)?.label;

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
          ml: 1,
        }}
        aria-label="Select sound theme"
      >
        <MusicNoteIcon fontSize="small" />
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
        {SOUND_OPTIONS.map((opt) => (
          <MenuItem
            key={opt.code}
            selected={opt.code === currentSound}
            onClick={() => handleSelect(opt.code)}
            sx={{ py: 1 }}
          >
            <ListItemText
              primary={
                <Box sx={{ fontWeight: opt.code === currentSound ? 700 : 400 }}>{opt.label}</Box>
              }
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

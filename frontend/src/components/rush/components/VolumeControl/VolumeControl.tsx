// src/components/VolumeControl.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, IconButton, Slider, Popper } from '@mui/material';
import {
  VolumeX as MuteIcon,
  Volume1 as LowIcon,
  Volume2 as MediumIcon,
  Volume2 as HighIcon,
} from 'lucide-react';

const STORAGE_KEY = 'app-volume-factor';

export default function VolumeControl() {
  const [volume, setVolume] = useState<number>(100);
  const [muted, setMuted] = useState<boolean>(false);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number>();
  const prevVolume = useRef<number>(volume || 50);

  useEffect(() => {
    // при старте читаем из localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const num = parseInt(saved, 10);
      setVolume(num);
      // сразу сохраняем ненулевое значение
      if (num > 0) prevVolume.current = num;
    }
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const handleVolumeChange = useCallback((_: Event, val: number | number[]) => {
    const v = Array.isArray(val) ? val[0] : val;
    setVolume(v);
    setMuted(v === 0);
    localStorage.setItem(STORAGE_KEY, String(v));
    localStorage.setItem(STORAGE_KEY, String(v / 100)); // <-- нововведение
  }, []);

  const toggleMute = () => {
    if (volume === 0) {
      // восстанавливаем предыдущую громкость
      const restored = prevVolume.current > 0 ? prevVolume.current : 50;
      setVolume(restored);
      // обновляем localStorage
      localStorage.setItem(STORAGE_KEY, String(restored));
      localStorage.setItem(STORAGE_KEY, String(restored / 100));
    } else {
      // запоминаем текущее ненулевое значение
      prevVolume.current = volume;
      setVolume(0);
      // сбрасываем в хранилище
      localStorage.setItem(STORAGE_KEY, '0');
      localStorage.setItem(STORAGE_KEY, '0');
    }
  };

  const openSlider = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSlider = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  const VolumeIcon =
    volume === 0 ? MuteIcon : volume < 33 ? LowIcon : volume < 66 ? MediumIcon : HighIcon;

  return (
    <>
      <IconButton
        ref={anchorRef}
        size="small"
        onClick={toggleMute}
        onMouseEnter={openSlider}
        onMouseLeave={closeSlider}
        aria-label={muted ? 'Unmute' : `Volume: ${volume}%`}
      >
        <VolumeIcon size={20} />
      </IconButton>

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom"
        disablePortal
        onMouseEnter={openSlider}
        onMouseLeave={closeSlider}
        modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
        sx={{ zIndex: 1300 }}
      >
        <Box
          sx={{
            p: 1,
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 3,
            display: 'flex',
            justifyContent: 'center', // горизонтальный центр
          }}
        >
          <Slider
            orientation="vertical"
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            aria-label="Volume control"
            size="small"
            valueLabelDisplay="off"
            sx={{
              height: 80,
              // теперь трек и бегунок по центру Box
              '& .MuiSlider-rail, & .MuiSlider-track': {
                width: 4,
                mx: 'auto',
              },
            }}
          />
        </Box>
      </Popper>
    </>
  );
}

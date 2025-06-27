// src/context/ColorModeContext.tsx

import React, { createContext, useMemo, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider, createTheme, PaletteMode, CssBaseline } from '@mui/material';

interface ColorModeContextType {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

export const ColorModeContext = createContext<ColorModeContextType>({
  mode: 'dark',
  toggleColorMode: () => {},
});

export function CustomThemeProvider({ children }: { children: ReactNode }) {
  // Инициализируем из localStorage или по умолчанию 'dark'
  const [mode, setMode] = useState<PaletteMode>(() => {
    const saved = window.localStorage.getItem('app-theme-mode') as PaletteMode | null;
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  // Сохраняем в localStorage при каждом изменении mode
  useEffect(() => {
    window.localStorage.setItem('app-theme-mode', mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
    }),
    [mode],
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          background: {
            default: mode === 'light' ? '#f0f0f0' : '#121212',
            paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
          },
          text: {
            primary: mode === 'light' ? 'rgba(0,0,0,0.87)' : '#ffffff',
            secondary: mode === 'light' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
          },
        },
      }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

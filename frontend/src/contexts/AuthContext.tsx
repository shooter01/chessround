// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { CircularProgress, Box, Typography } from '@mui/material';

// Тип пользователя
export interface User {
  id: string;
  username: string;
  perfs: Record<string, any>;
  // ...другие поля из /api/account
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  error: null,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Функция для logout: вызывает бекенд, очищает state
  const logout = async () => {
    try {
      await axios.post('http://localhost:5000/lichess_auth/logout', {}, { withCredentials: true });
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setUser(null);
    }
  };

  useEffect(() => {
    // Пытаемся получить профиль из бекенда
    axios
      .get<User>('http://localhost:5000/lichess_auth/user', { withCredentials: true })
      .then((res) => {
        setUser(res.data.data);
        setToken(res.data.token);
      })
      .catch((err) => {
        if (err.response?.status !== 401) {
          setError(err.response?.data || err.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Пока идёт загрузка, показываем спиннер по центру экрана
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="#000"
        color="#fff"
      >
        {error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <CircularProgress size={80} color="inherit" />
        )}
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
};

// Хук для доступа к контексту
export const useAuth = (): AuthContextValue => useContext(AuthContext);

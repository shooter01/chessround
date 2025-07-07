// src/components/PuzzleDisplay.tsx

import React, { useState, useEffect } from 'react';
import { Container, Box, Button, CircularProgress, Typography } from '@mui/material';

export default function PuzzleDisplay() {
  const [authUri, setAuthUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the authorization URI on component mount
    fetch('http://localhost:5000/lichess_auth/auth')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data: { authorizationUri: string }) => {
        setAuthUri(data.authorizationUri);
      })
      .catch((err) => {
        console.error('Failed to fetch auth URI:', err);
        setError('Не удалось загрузить ссылку для входа.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = () => {
    if (authUri) {
      window.location.href = authUri;
    }
  };

  return (
    <Container>
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <Button
            variant="contained"
            size="large"
            sx={{
              p: 2,
              borderRadius: '16px',
              boxShadow: 3,
              fontSize: '1.2rem',
              background: 'linear-gradient(45deg, #4caf50 30%, #81c784 90%)',
              textTransform: 'none',
            }}
            onClick={handleLogin}
          >
            Войти через Lichess
          </Button>
        )}
      </Box>
    </Container>
  );
}

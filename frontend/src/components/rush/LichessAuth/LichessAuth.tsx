// src/components/PuzzleDisplay.tsx

import React, { useState, useEffect } from 'react';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import { API_BASE } from '@api/api';

export default function PuzzleDisplay() {
  const [authUri, setAuthUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the authorization URI on component mount
    fetch(`${API_BASE}/lichess_auth/auth`)
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
    if (authUri) window.location.href = authUri;
  };

  return (
    <Container>
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="baseline"
        alignItems="center"
        minHeight="100vh"
      >
        {loading ? (
          <CircularProgress size={80} />
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <Box
            component="button"
            onClick={handleLogin}
            sx={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              p: 0,
              mb: 2,
              mt: 12,
              '&:hover svg path': {
                fill: '#4caf50',
              },
            }}
          >
            {/* Lichess Logo */}
            <Box component="svg" viewBox="0 0 50 50" width={100} height={100}>
              <path
                fill="#ffffff"
                stroke="#ffffff"
                strokeLinejoin="round"
                d="M38.956.5c-3.53.418-6.452.902-9.286 2.984C5.534 1.786-.692 18.533.68 29.364 3.493 50.214 31.918 55.785 41.329 41.7c-7.444 7.696-19.276 8.752-28.323 3.084C3.959 39.116-.506 27.392 4.683 17.567 9.873 7.742 18.996 4.535 29.03 6.405c2.43-1.418 5.225-3.22 7.655-3.187l-1.694 4.86 12.752 21.37c-.439 5.654-5.459 6.112-5.459 6.112-.574-1.47-1.634-2.942-4.842-6.036-3.207-3.094-17.465-10.177-15.788-16.207-2.001 6.967 10.311 14.152 14.04 17.663 3.73 3.51 5.426 6.04 5.795 6.756 0 0 9.392-2.504 7.838-8.927L37.4 7.171z"
              />
            </Box>
            <Typography variant="h6" sx={{ mt: 1, color: 'common.white' }}>
              Войти через Lichess
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}

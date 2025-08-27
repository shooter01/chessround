import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Box, Typography, CircularProgress, Divider } from '@mui/material';
import axios from 'axios';
import Board from '../Board/Board';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

type Player = { user_id: string; username: string; color: 'w' | 'b'; rating_pre?: number };
type DuelGameInfo = {
  game: { short_id: string; tc_seconds: number; inc_seconds: number; status: string };
  players: Player[];
  puzzles?: any;
};

const DuelGame: React.FC = () => {
  const { shortId } = useParams();
  const [info, setInfo] = useState<DuelGameInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        // предполагается, что на бэкенде есть GET /duel/:shortId
        const { data } = await axios.get(`${API_BASE}/duel/${shortId}`, { withCredentials: true });
        if (!dead) setInfo(data);
      } catch (e) {
        if (!dead) setErr('Не удалось загрузить игру');
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [shortId]);

  if (loading) {
    return (
      <Container sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }
  if (err) {
    return (
      <Container sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="error">{err}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6" fontWeight={700}>
          Duel #{info?.game.short_id}
        </Typography>
        {info?.game && (
          <Typography variant="body2" color="text.secondary">
            Time: {Math.floor(info.game.tc_seconds / 60)}+{info.game.inc_seconds}
          </Typography>
        )}
      </Box>
      <Divider sx={{ mb: 2 }} />

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '2fr 1fr' }} gap={2}>
        <Box>
          <Board />
        </Box>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Players
          </Typography>
          {info?.players?.map((p) => (
            <Box key={p.user_id} display="flex" justifyContent="space-between" mb={0.5}>
              <Typography>
                {p.color === 'w' ? 'White' : 'Black'}: {p.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {p.rating_pre ?? 1500}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Container>
  );
};

export default DuelGame;

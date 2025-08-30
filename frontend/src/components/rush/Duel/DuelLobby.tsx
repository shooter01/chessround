import React, { useMemo, useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Tabs,
  Tab,
  Divider,
  Chip,
  Collapse,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Tooltip,
  Button,
  Stack,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CircleIcon from '@mui/icons-material/Circle';

export type Friend = {
  id: string;
  name: string;
  rating: number;
  online: boolean;
  avatarUrl?: string;
  flagUrl?: string;
};

type Opponent = 'random' | Friend;

export type Search = {
  id: number;
  user_id: string;
  username: string;
  rating: number;
  tc_seconds: number;
  inc_seconds: number;
  created_at: string;
};

export interface DuelLobbyProps {
  rating?: number;
  monthPoints?: number | null;
  isGuest?: boolean;
  friends?: Friend[]; // онлайн-список
  searches?: Search[]; // открытые заявки «ищет игру»
  mySearching?: boolean; // я сейчас ищу игру
  selfId?: string; // текущий userId (для «You» и дизейбла Accept)
  loading?: boolean;

  // Play: в новом режиме всегда 'random' -> сохраним старую сигнатуру ради совместимости
  onPlay: (opponent?: Opponent) => void;
  onCancelSearch?: () => void; // отменить свой поиск
  onAcceptSearch?: (searchId: number) => void;

  onTabChange?: (tab: 'play' | 'watch' | 'leaderboard') => void;
}

const fallbackFriends: Friend[] = [];
const fallbackSearches: Search[] = [];

const formatPoints = (v: number | null | undefined) =>
  v == null ? '--' : Intl.NumberFormat().format(v);

const formatTC = (tc: number, inc: number) => `${Math.floor(tc / 60)}+${inc}`;

const DuelLobby: React.FC<DuelLobbyProps> = ({
  rating = 1454,
  monthPoints = null,
  isGuest = true,
  friends = fallbackFriends,
  searches = fallbackSearches,
  mySearching = false,
  selfId,
  loading = false,
  onPlay,
  onCancelSearch,
  onAcceptSearch,
  onTabChange,
}) => {
  const [tab, setTab] = useState<'play' | 'watch' | 'leaderboard'>('play');
  const [showOnline, setShowOnline] = useState(false);

  const online = useMemo(() => friends.filter((f) => f.online), [friends]);

  const handlePlayClick = () => {
    if (mySearching) {
      if (onCancelSearch) onCancelSearch();
      else onPlay('random'); // back-compat: если родитель не дал onCancelSearch
    } else {
      onPlay('random');
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        bgcolor: 'background.default',
        borderRadius: 2,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 520,
        width: '100%',
      }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="center" position="relative" mb={1.5}>
        <ShieldIcon sx={{ mr: 1, fontSize: 28, color: 'success.main' }} />
        <Typography variant="h5" fontWeight={800}>
          Puzzle Battle
        </Typography>
      </Box>

      {/* Stats */}
      <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1} mb={1}>
        <Box textAlign="center">
          <Typography variant="caption" color="text.secondary">
            AUGUST POINTS
          </Typography>
          <Typography variant="h6" fontWeight={800}>
            {formatPoints(monthPoints)}
          </Typography>
        </Box>
        <Box textAlign="center">
          <Typography variant="caption" color="text.secondary">
            RATING
          </Typography>
          <Box display="inline-flex" alignItems="center" gap={0.5}>
            <FlashOnIcon fontSize="small" />
            <Typography variant="h6" fontWeight={800}>
              {rating}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => {
          setTab(v);
          onTabChange?.(v);
        }}
        variant="fullWidth"
        sx={{
          minHeight: 36,
          '& .MuiTab-root': { minHeight: 36, py: 0.5 },
        }}
      >
        <Tab value="play" label="Play" />
        <Tab value="watch" label="Watch" />
        <Tab value="leaderboard" label="Leaderboard" />
      </Tabs>
      <Divider sx={{ mb: 1.5 }} />

      {/* Online summary + toggle */}
      <Box mt={0.25} mb={1} display="flex" alignItems="center" gap={1}>
        <Chip
          size="small"
          icon={
            <ExpandMoreIcon
              sx={{ transform: showOnline ? 'rotate(180deg)' : 'none', transition: '0.15s' }}
            />
          }
          label={`${online.length} Online`}
          onClick={() => setShowOnline((v) => !v)}
          variant="outlined"
        />
        {mySearching && <Chip size="small" color="warning" label="Searching…" />}
      </Box>

      {/* Online list (informational) */}
      <Collapse in={showOnline} unmountOnExit>
        <List dense disablePadding sx={{ mt: 0.5, maxHeight: 160, overflowY: 'auto' }}>
          {online.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1 }}>
              No one online
            </Typography>
          )}
          {online.map((f) => (
            <ListItem key={f.id} sx={{ px: 1 }}>
              <ListItemAvatar>
                <Avatar src={f.avatarUrl}>{f.name?.[0]}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={0.75}>
                    <Tooltip title="online">
                      <CircleIcon sx={{ color: 'success.main', fontSize: 10 }} />
                    </Tooltip>
                    <Typography variant="body2" fontWeight={600}>
                      {f.name}
                    </Typography>
                  </Box>
                }
                secondary={<Typography variant="caption">({f.rating})</Typography>}
              />
            </ListItem>
          ))}
        </List>
      </Collapse>

      {/* Searches list */}
      <Box mt={1}>
        <Typography variant="overline" color="text.secondary">
          Looking for a game
        </Typography>
        <List dense disablePadding sx={{ mt: 0.5, maxHeight: 220, overflowY: 'auto' }}>
          {searches.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1 }}>
              Nobody is searching yet
            </Typography>
          )}
          {searches.map((s) => {
            const isMe = selfId && s.user_id === selfId;
            return (
              <ListItem
                key={s.id}
                sx={{
                  borderRadius: 1,
                  px: 1,
                  mb: 0.5,
                  bgcolor: isMe ? 'action.selected' : 'transparent',
                }}
                secondaryAction={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={formatTC(s.tc_seconds, s.inc_seconds)} />
                    {isMe ? (
                      <Chip size="small" color="warning" label="You" />
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={loading || tab !== 'play' || isGuest}
                        onClick={() => onAcceptSearch?.(s.id)}
                      >
                        Accept
                      </Button>
                    )}
                  </Stack>
                }
              >
                <ListItemAvatar>
                  <Avatar>{s.username?.[0]?.toUpperCase()}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={600}>
                      {s.username}
                    </Typography>
                  }
                  secondary={<Typography variant="caption">({s.rating})</Typography>}
                />
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      {/* Play / Cancel button */}
      <Button
        size="large"
        fullWidth
        sx={{ borderRadius: 2, py: 1.25, fontWeight: 800 }}
        color={mySearching ? 'warning' : 'success'}
        variant={mySearching ? 'outlined' : 'contained'}
        disabled={loading || tab !== 'play' || isGuest}
        onClick={handlePlayClick}
      >
        {isGuest ? 'Login to play' : mySearching ? 'Cancel search' : 'Play!'}
      </Button>
    </Paper>
  );
};

export default DuelLobby;

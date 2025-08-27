import React, { useMemo, useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Tabs,
  Tab,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Chip,
  Collapse,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Tooltip,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import SearchIcon from '@mui/icons-material/Search';
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

export interface DuelLobbyProps {
  rating?: number;
  monthPoints?: number | null; // можно подать null -> покажет "--"
  friends?: Friend[];
  loading?: boolean;
  onPlay: (opponent: Opponent) => void;
  onTabChange?: (tab: 'play' | 'watch' | 'leaderboard') => void;
}

const fallbackFriends: Friend[] = [];

const formatPoints = (v: number | null | undefined) =>
  v == null ? '--' : Intl.NumberFormat().format(v);

const DuelLobby: React.FC<DuelLobbyProps> = ({
  rating = 1454,
  monthPoints = null,
  isGuest = true,
  friends = fallbackFriends,
  loading = false,
  onPlay,
  onTabChange,
}) => {
  const [tab, setTab] = useState<'play' | 'watch' | 'leaderboard'>('play');
  const [showFriends, setShowFriends] = useState(false);
  const [opponent, setOpponent] = useState<Opponent>('random');

  const online = useMemo(() => friends.filter((f) => f.online), [friends]);

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

      {/* Opponent search / selector */}
      <TextField
        fullWidth
        size="small"
        value={opponent === 'random' ? 'vs Random' : `vs ${opponent.name}`}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => setShowFriends((v) => !v)}
                aria-label="Choose opponent"
              >
                <SearchIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* Friends online */}
      <Box mt={0.75} display="flex" alignItems="center" gap={1}>
        <Chip
          size="small"
          icon={
            <ExpandMoreIcon
              sx={{ transform: showFriends ? 'rotate(180deg)' : 'none', transition: '0.15s' }}
            />
          }
          label={`${online.length} Friends Online`}
          onClick={() => setShowFriends((v) => !v)}
          variant="outlined"
        />
        {opponent !== 'random' && (
          <Chip
            size="small"
            label="Random"
            variant="filled"
            onClick={() => setOpponent('random')}
          />
        )}
      </Box>

      <Collapse in={showFriends} unmountOnExit>
        <List dense disablePadding sx={{ mt: 0.75, maxHeight: 220, overflowY: 'auto' }}>
          {online.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1 }}>
              No friends online
            </Typography>
          )}
          {online.map((f) => (
            <ListItem
              key={f.id}
              sx={{
                borderRadius: 1,
                px: 1,
                '&:hover': { bgcolor: 'action.hover', cursor: 'pointer' },
              }}
              onClick={() => {
                setOpponent(f);
                setShowFriends(false);
              }}
            >
              <ListItemAvatar>
                <Avatar src={f.avatarUrl}>{f.name[0]}</Avatar>
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
              {f.flagUrl && <Avatar src={f.flagUrl} sx={{ width: 16, height: 16 }} />}
            </ListItem>
          ))}
        </List>
      </Collapse>

      <Box sx={{ flexGrow: 1 }} />

      {/* Play button fixed to bottom of panel */}
      <Button
        size="large"
        variant="contained"
        color="success"
        fullWidth
        disabled={loading || tab !== 'play' || isGuest}
        sx={{ borderRadius: 2, py: 1.25, fontWeight: 800 }}
        onClick={() => onPlay(opponent)}
      >
        {isGuest ? 'Login to play' : 'Play!'}
      </Button>
    </Paper>
  );
};

export default DuelLobby;

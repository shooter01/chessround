import React, { useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';

export interface LeaderboardRow {
  userId: string | number;
  userName: string;
  rounds: Array<number | null>; // длина = maxRounds
  total: number; // очки
  timeSec: number; // суммарное время
}

export interface LeaderboardTableProps {
  rows: LeaderboardRow[];
  maxRounds: number;
  currentUserId?: string | number;
  height?: number; // высота прокрутки, по умолчанию 420
  onUserClick?: (userId: string | number) => void;
}

function fmtTime(sec: number) {
  if (!Number.isFinite(sec)) return '-';
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

/**
 * Конкурентное ранжирование: 1, 2, 2, 4 ...
 * сортировка: total DESC, time ASC
 */
function rankRows(rows: LeaderboardRow[]) {
  const sorted = [...rows].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.timeSec - b.timeSec;
  });
  let lastScore = Number.NEGATIVE_INFINITY;
  let lastTime = Number.NEGATIVE_INFINITY;
  let lastPlace = 0;
  return sorted.map((row, idx) => {
    const isTie = row.total === lastScore && row.timeSec === lastTime;
    const place = isTie ? lastPlace : idx + 1;
    lastScore = row.total;
    lastTime = row.timeSec;
    lastPlace = place;
    return { place, ...row };
  });
}

export default function LeaderboardTable({
  rows,
  maxRounds,
  currentUserId,
  height = 420,
  onUserClick,
}: LeaderboardTableProps) {
  const ranked = useMemo(() => rankRows(rows), [rows]);

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: height }}>
        <Table stickyHeader size="small" aria-label="leaderboard">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 64, fontWeight: 700 }}>Место</TableCell>
              <TableCell sx={{ minWidth: 220, fontWeight: 700 }}>Игрок</TableCell>
              {Array.from({ length: maxRounds }).map((_, i) => (
                <TableCell key={i} align="center" sx={{ width: 40, p: 0.5, fontWeight: 700 }}>
                  {i + 1}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ width: 72, fontWeight: 700 }}>
                Очки
              </TableCell>
              <TableCell align="center" sx={{ width: 90, fontWeight: 700 }}>
                Время
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ranked.map((r) => {
              const highlight = String(r.userId) === String(currentUserId);
              return (
                <TableRow
                  key={r.userId}
                  hover
                  sx={{
                    cursor: onUserClick ? 'pointer' : 'default',
                    bgcolor: highlight ? 'rgba(25, 118, 210, 0.08)' : undefined,
                  }}
                  onClick={() => onUserClick?.(r.userId)}
                >
                  <TableCell sx={{ fontWeight: 700 }}>#{r.place}</TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Tooltip title={r.userName}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: highlight ? 700 : 500 }}>
                        {r.userName}
                      </Typography>
                    </Tooltip>
                  </TableCell>

                  {Array.from({ length: maxRounds }).map((_, i) => (
                    <TableCell
                      key={i}
                      align="center"
                      sx={{ p: 0.5, color: r.rounds[i] ? 'text.primary' : 'text.disabled' }}
                    >
                      {r.rounds[i] ?? '–'}
                    </TableCell>
                  ))}

                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {r.total}
                  </TableCell>
                  <TableCell align="center">{fmtTime(r.timeSec)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

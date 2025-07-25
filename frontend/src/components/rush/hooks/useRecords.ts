import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '@api/api';

export function useRecords(mode: string, token: string) {
  const [bestToday, setBestToday] = useState(0);
  const [bestAllTime, setBestAllTime] = useState(0);

  const fetchRecords = useCallback(async () => {
    try {
      const resp = await axios.get(`${API_BASE}/puzzles/record`, {
        params: { mode },
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const { today, allTime } = resp.data.record;
      setBestToday(today);
      setBestAllTime(allTime);
    } catch (err) {
      console.error('Failed to load records:', err);
    }
  }, [mode, token]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { bestToday, bestAllTime, refetchRecords: fetchRecords };
}

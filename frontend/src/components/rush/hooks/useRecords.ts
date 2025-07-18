// hooks/useRecords.ts
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '@api/api';

export function useRecords(mode: string, token: string) {
  const [bestToday, setBestToday] = useState(0);
  const [bestAllTime, setBestAllTime] = useState(0);
  console.log('mode:', mode);

  useEffect(() => {
    // if (!showResults) return;

    const fetchRecords = async () => {
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
    };

    fetchRecords();
  }, [mode, token]);

  return { bestToday, bestAllTime };
}

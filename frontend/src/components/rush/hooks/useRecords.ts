// hooks/useRecords.ts
import { useState, useEffect } from 'react';
import axios from 'axios';

export function useRecords(showResults: boolean, token: string) {
  const [bestToday, setBestToday] = useState(0);
  const [bestAllTime, setBestAllTime] = useState(0);
  console.log('showResults:', showResults);

  useEffect(() => {
    // if (!showResults) return;

    const fetchRecords = async () => {
      try {
        const resp = await axios.get('http://localhost:5000/puzzles/record', {
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
  }, [showResults, token]);

  return { bestToday, bestAllTime };
}

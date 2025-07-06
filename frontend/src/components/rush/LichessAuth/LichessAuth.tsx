// src/components/PuzzleDisplay.tsx

import React, { useState, useEffect } from 'react';
import { Container, Grid, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Chess, SQUARES } from 'chess.js';
import Board from '../Board/Board';
import { puzzles } from './mocks/mock';
import './styles.css';
import { Chessground } from 'chessground';
import CurrentPuzzle from '../Rush/current/current';

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
const VERIFIER_LEN = 96;

function base64url(bytes) {
  const b64 = btoa(bytes);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function generatePKCE() {
  const arr = new Uint32Array(VERIFIER_LEN);
  crypto.getRandomValues(arr);
  const verifier = Array.from(arr)
    .map((n) => CHARSET[n % CHARSET.length])
    .join('');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const hash = String.fromCharCode(...new Uint8Array(buf));
  const challenge = base64url(hash);
  return { verifier, challenge };
}

if (!window.site) window.site = {} as Site;
if (!window.site.load)
  window.site.load = new Promise<void>((resolve) => {
    document.addEventListener('DOMContentLoaded', () => resolve());
  });

export default function PuzzleDisplay() {
  const onClick = async () => {
    const { verifier, challenge } = await generatePKCE();
    const state = Math.random().toString(36).slice(2);

    localStorage.setItem('pkce_verifier', verifier);
    localStorage.setItem('pkce_state', state);

    const redirectUri = 'http://localhost:3000/lichess-callback';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: 'lip_vJMHMJyxiPN4Zc1SkL1Y',
      redirect_uri: redirectUri,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `https://lichess.org/oauth?${params}`;
  };

  return <button onClick={onClick}>Log in with Lichess</button>;
}

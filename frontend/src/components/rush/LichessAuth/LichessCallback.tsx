// LichessCallback.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LichessCallback() {
  const nav = useNavigate();
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const code = q.get('code');
    const state = q.get('state');
    const saved = localStorage.getItem('pkce_state');
    if (!code || state !== saved) {
      alert('PKCE error');
      return;
    }
    const verifier = localStorage.getItem('pkce_verifier');
    fetch('http://localhost:5000/lichess_auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, verifier }),
      credentials: 'include',
    })
      .then((res) => {
        if (res.ok) nav('/profile');
        else throw new Error('Login failed');
      })
      .catch(console.error);
  }, [nav]);

  return <div>Logging in…</div>;
}

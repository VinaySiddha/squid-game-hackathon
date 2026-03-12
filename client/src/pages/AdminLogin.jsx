import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SquidShapes from '../components/SquidShapes';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('admin_token', data.token);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--sg-black-deep)', padding: 16,
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#1a1a2e', padding: '32px 24px', borderRadius: 12,
        border: '1px solid #333', width: '100%', maxWidth: 360, textAlign: 'center',
      }}>
        <SquidShapes size={28} />
        <h1 style={{ fontFamily: 'var(--font-number)', color: 'var(--sg-pink)', fontSize: 22, margin: '16px 0' }}>
          ADMIN ACCESS
        </h1>
        {error && <p style={{ color: 'var(--sg-red)', marginBottom: 12, fontSize: 14 }}>{error}</p>}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          style={{
            width: '100%', padding: '12px 16px', background: '#0f0f1a',
            border: '1px solid #333', borderRadius: 8, color: '#fff',
            fontSize: 16, marginBottom: 16, outline: 'none',
          }}
        />
        <button type="submit" style={{
          width: '100%', padding: '12px', background: 'var(--sg-pink)',
          color: '#fff', border: 'none', borderRadius: 8, fontSize: 16,
          fontWeight: 600, cursor: 'pointer', letterSpacing: 2,
        }}>
          ENTER
        </button>
      </form>
    </div>
  );
}

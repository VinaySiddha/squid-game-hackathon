import { useState, useRef } from 'react';
import { apiFetch } from '../../api';
import Webcam from '../Webcam';

export default function CheckinStation() {
  const [playerNumber, setPlayerNumber] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const webcamRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!playerNumber.trim()) {
      setStatus({ type: 'error', message: 'Enter a player number' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const blob = await webcamRef.current?.capture();
      if (!blob) {
        setStatus({ type: 'error', message: 'Failed to capture photo' });
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('photo', blob, `player_${playerNumber}.jpg`);
      formData.append('player_number', playerNumber.padStart(3, '0'));

      const result = await apiFetch('/checkin', { method: 'POST', body: formData });
      setStatus({ type: 'success', message: `Player ${result.player_number} checked in!` });
      setPlayerNumber('');
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>CHECK-IN STATION</h1>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <Webcam ref={webcamRef} width={400} height={300} />
        <form onSubmit={handleSubmit} style={{ flex: 1 }}>
          <label style={{ display: 'block', color: 'var(--sg-gray)', fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>
            PLAYER NUMBER
          </label>
          <input
            type="text"
            value={playerNumber}
            onChange={(e) => setPlayerNumber(e.target.value.replace(/\D/g, '').slice(0, 3))}
            placeholder="001"
            maxLength={3}
            style={{
              width: '100%', padding: '14px 16px', background: '#0f0f1a',
              border: '1px solid #333', borderRadius: 8, color: '#fff',
              fontFamily: 'var(--font-number)', fontSize: 28, marginBottom: 16,
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: 14, background: 'var(--sg-green)',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 16,
              fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1, letterSpacing: 2,
            }}
          >
            {loading ? 'CAPTURING...' : 'CAPTURE & SUBMIT'}
          </button>

          {status && (
            <p style={{
              marginTop: 16, padding: 12, borderRadius: 8,
              background: status.type === 'success' ? 'var(--sg-green-dim)' : 'var(--sg-red-dim)',
              color: status.type === 'success' ? 'var(--sg-green-bright)' : 'var(--sg-red)',
            }}>
              {status.message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

export default function Settings() {
  const [total, setTotal] = useState('');
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/settings/total-participants')
      .then(data => setTotal(String(data.total_participants)))
      .catch(() => setTotal('300'));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setSaved(null);
    try {
      const data = await apiFetch('/settings/total-participants', {
        method: 'POST',
        body: JSON.stringify({ total_participants: parseInt(total) }),
      });
      setSaved({ type: 'success', message: `Total participants set to ${data.total_participants}. Refresh the wall page to apply.` });
    } catch (err) {
      setSaved({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>SETTINGS</h1>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ color: 'var(--sg-pink)', fontSize: 13, letterSpacing: 2, marginBottom: 8 }}>
          TOTAL PARTICIPANTS
        </h3>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
          Number of player slots on the projector wall. The grid will auto-adjust.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="number"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            min="1"
            max="999"
            style={{
              width: 120, padding: 12, background: '#0f0f1a', border: '1px solid #333',
              borderRadius: 8, color: '#fff', fontSize: 24, fontFamily: 'var(--font-number)',
              textAlign: 'center',
            }}
          />
          <button onClick={handleSave} disabled={loading} style={{
            padding: '12px 24px', background: 'var(--sg-pink)',
            color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
            fontSize: 14, letterSpacing: 2,
          }}>
            SAVE
          </button>
        </div>
        {saved && (
          <p style={{
            marginTop: 10, padding: 10, borderRadius: 6, fontSize: 13,
            background: saved.type === 'success' ? 'var(--sg-green-dim)' : 'var(--sg-red-dim)',
            color: saved.type === 'success' ? 'var(--sg-green-bright)' : 'var(--sg-red)',
          }}>{saved.message}</p>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

export default function PlayerList() {
  const [participants, setParticipants] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());

  const fetchParticipants = async () => {
    try {
      const data = await apiFetch('/participants');
      setParticipants(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchParticipants(); }, []);

  const toggleEliminate = async (p) => {
    try {
      if (p.is_alive) {
        await apiFetch(`/participants/${p.id}/eliminate`, { method: 'PATCH' });
      } else {
        await apiFetch(`/participants/${p.id}/revive`, { method: 'PATCH' });
      }
      fetchParticipants();
    } catch (err) {
      console.error(err);
    }
  };

  const eliminateSelected = async () => {
    if (selected.size === 0) return;
    try {
      await apiFetch('/participants/eliminate-bulk', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      setSelected(new Set());
      fetchParticipants();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = participants.filter(p =>
    (p.player_number || '').includes(search) || (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1>PLAYERS</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by name or number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, padding: '10px 14px', background: '#0f0f1a',
            border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14,
          }}
        />
        {selected.size > 0 && (
          <button onClick={eliminateSelected} style={{
            padding: '10px 20px', background: 'var(--sg-red)', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
          }}>
            ELIMINATE {selected.size} SELECTED
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
        {filtered.map(p => (
          <div key={p.id} style={{
            background: '#1a1a2e', border: `1px solid ${p.is_alive ? '#333' : 'var(--sg-red)'}`,
            borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            opacity: p.is_alive ? 1 : 0.5,
          }}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggleSelect(p.id)}
                style={{ accentColor: 'var(--sg-pink)' }}
              />
              <span style={{
                fontFamily: 'var(--font-number)', fontSize: 14,
                color: p.is_alive ? 'var(--sg-green-bright)' : 'var(--sg-red)',
              }}>
                {p.player_number || '---'}
              </span>
            </div>
            {p.photo_url ? (
              <img src={p.photo_url} alt="" style={{
                width: 60, height: 60, borderRadius: '50%', objectFit: 'cover',
                filter: p.is_alive ? 'none' : 'grayscale(100%)',
              }} />
            ) : (
              <div style={{
                width: 60, height: 60, borderRadius: '50%', background: '#0f0f1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 11,
              }}>
                No photo
              </div>
            )}
            <div style={{ fontSize: 12, color: '#ccc', textAlign: 'center' }}>{p.name || 'Unknown'}</div>
            <button onClick={() => toggleEliminate(p)} style={{
              width: '100%', padding: '6px', fontSize: 11,
              background: p.is_alive ? 'var(--sg-red-dim)' : 'var(--sg-green-dim)',
              color: p.is_alive ? 'var(--sg-red)' : 'var(--sg-green-bright)',
              border: 'none', borderRadius: 4, cursor: 'pointer', letterSpacing: 1,
            }}>
              {p.is_alive ? 'ELIMINATE' : 'REVIVE'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

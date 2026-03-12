import { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

export default function Dashboard() {
  const [participants, setParticipants] = useState([]);
  const [popup, setPopup] = useState(null);
  const [deleteNum, setDeleteNum] = useState('');
  const [deleteStatus, setDeleteStatus] = useState(null);

  const fetchData = async () => {
    try {
      const data = await apiFetch('/participants');
      if (Array.isArray(data)) setParticipants(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const total = participants.length;
  const checkedIn = participants.filter(p => p.is_checked_in);
  const notCheckedIn = participants.filter(p => !p.is_checked_in);
  const alive = participants.filter(p => p.is_alive && p.is_checked_in);
  const eliminated = participants.filter(p => !p.is_alive && p.is_checked_in);

  const stats = [
    { label: 'TOTAL', value: total, color: '#E91E7B', list: participants },
    { label: 'CHECKED IN', value: checkedIn.length, color: '#0B6E4F', list: checkedIn },
    { label: 'NOT CHECKED IN', value: notCheckedIn.length, color: '#888', list: notCheckedIn },
    { label: 'ALIVE', value: alive.length, color: '#00ff88', list: alive },
    { label: 'ELIMINATED', value: eliminated.length, color: '#ff0040', list: eliminated },
  ];

  const handleDeleteById = async (id, playerNumber) => {
    if (!confirm(`Delete player ${playerNumber}?`)) return;
    try {
      await apiFetch(`/participants/${id}`, { method: 'DELETE' });
      await fetchData();
      // Update popup list
      setPopup(prev => prev ? { ...prev, list: prev.list.filter(p => p.id !== id) } : null);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleDeleteByNumber = async () => {
    if (!deleteNum.trim()) return;
    const num = deleteNum.trim().padStart(3, '0');
    const p = participants.find(x => x.player_number === num);
    if (!p) {
      setDeleteStatus({ type: 'error', message: `Player ${num} not found` });
      return;
    }
    if (!confirm(`Delete player ${num} (${p.name || 'unnamed'})?`)) return;
    try {
      await apiFetch(`/participants/${p.id}`, { method: 'DELETE' });
      setDeleteStatus({ type: 'success', message: `Player ${num} deleted` });
      setDeleteNum('');
      await fetchData();
    } catch (err) {
      setDeleteStatus({ type: 'error', message: err.message });
    }
  };

  return (
    <div>
      <h1>DASHBOARD</h1>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 16, marginTop: 16,
      }}>
        {stats.map(s => (
          <div
            key={s.label}
            onClick={() => setPopup(s)}
            style={{
              background: '#1a1a2e', border: `1px solid ${s.color}33`, borderRadius: 12,
              padding: 20, textAlign: 'center', cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = `0 0 20px ${s.color}33`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ fontSize: 42, fontWeight: 'bold', color: s.color, fontFamily: 'var(--font-number)' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginTop: 6 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quick delete by player number */}
      <div style={{ marginTop: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Player # to delete"
          value={deleteNum}
          onChange={e => setDeleteNum(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleDeleteByNumber()}
          style={{
            width: 160, padding: 10, background: '#0f0f1a', border: '1px solid #333',
            borderRadius: 8, color: '#fff', fontSize: 14, fontFamily: 'var(--font-number)',
          }}
        />
        <button onClick={handleDeleteByNumber} style={{
          padding: '10px 20px', background: '#ff0040', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, letterSpacing: 2,
        }}>
          DELETE
        </button>
        <button onClick={fetchData} style={{
          padding: '10px 20px', background: '#333', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, letterSpacing: 2,
        }}>
          REFRESH
        </button>
      </div>
      {deleteStatus && (
        <p style={{
          marginTop: 8, padding: 8, borderRadius: 6, fontSize: 13, display: 'inline-block',
          background: deleteStatus.type === 'success' ? 'var(--sg-green-dim)' : 'var(--sg-red-dim)',
          color: deleteStatus.type === 'success' ? 'var(--sg-green-bright)' : 'var(--sg-red)',
        }}>{deleteStatus.message}</p>
      )}

      {/* Popup */}
      {popup && (
        <div
          onClick={() => setPopup(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1a1a2e', border: `1px solid ${popup.color}55`, borderRadius: 16,
              padding: 30, width: '80vw', maxWidth: 700, maxHeight: '80vh',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 36, fontWeight: 'bold', color: popup.color, fontFamily: 'var(--font-number)' }}>
                  {popup.value}
                </span>
                <span style={{ fontSize: 14, color: '#888', marginLeft: 12, letterSpacing: 2 }}>
                  {popup.label}
                </span>
              </div>
              <button
                onClick={() => setPopup(null)}
                style={{
                  background: 'none', border: '1px solid #333', borderRadius: 8,
                  color: '#888', fontSize: 18, padding: '4px 12px', cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333', color: '#666', textAlign: 'left' }}>
                    <th style={{ padding: '8px 6px' }}>#</th>
                    <th style={{ padding: '8px 6px' }}>NAME</th>
                    <th style={{ padding: '8px 6px' }}>STATUS</th>
                    <th style={{ padding: '8px 6px', width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {popup.list.map(p => (
                    <tr key={p.id || p.player_number} style={{ borderBottom: '1px solid #1f1f3a' }}>
                      <td style={{ padding: '8px 6px', color: '#E91E7B', fontFamily: 'var(--font-number)' }}>
                        {p.player_number}
                      </td>
                      <td style={{ padding: '8px 6px', color: '#e0e0e0' }}>
                        {p.name || '—'}
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        {p.is_checked_in ? (
                          p.is_alive
                            ? <span style={{ color: '#00ff88' }}>ALIVE</span>
                            : <span style={{ color: '#ff0040' }}>ELIMINATED</span>
                        ) : (
                          <span style={{ color: '#555' }}>NOT CHECKED IN</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <button
                          onClick={() => handleDeleteById(p.id, p.player_number)}
                          style={{
                            background: 'none', border: '1px solid #ff004066', borderRadius: 6,
                            color: '#ff0040', fontSize: 11, padding: '3px 8px', cursor: 'pointer',
                            letterSpacing: 1,
                          }}
                        >
                          DEL
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {popup.list.length === 0 && (
                <p style={{ textAlign: 'center', color: '#555', padding: 20 }}>No participants</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

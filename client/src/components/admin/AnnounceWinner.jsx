import { useState, useEffect } from 'react';
import socket from '../../socket';

export default function AnnounceWinner() {
  const [playerNumber, setPlayerNumber] = useState('');
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [sent, setSent] = useState(null);

  useEffect(() => {
    socket.connect();
    return () => socket.disconnect();
  }, []);

  const handleAnnounce = (type) => {
    if (!playerNumber.trim() || !name.trim()) {
      setSent({ type: 'error', message: 'Player number and name are required' });
      return;
    }
    socket.emit('announce', {
      type,
      player_number: playerNumber.trim().padStart(3, '0'),
      name: name.trim(),
      team_name: teamName.trim() || null,
    });
    setSent({ type: 'success', message: `${type === 'winner' ? 'Winner' : 'Runner-up'} announced on wall!` });
  };

  return (
    <div>
      <h1>ANNOUNCE WINNER</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
        Show a celebration popup on the projector wall.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
        <input
          type="text"
          placeholder="Player Number (e.g. 042)"
          value={playerNumber}
          onChange={(e) => setPlayerNumber(e.target.value)}
          style={{
            padding: 12, background: '#0f0f1a', border: '1px solid #333',
            borderRadius: 8, color: '#fff', fontSize: 14, fontFamily: 'var(--font-number)',
          }}
        />
        <input
          type="text"
          placeholder="Player / Team Leader Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            padding: 12, background: '#0f0f1a', border: '1px solid #333',
            borderRadius: 8, color: '#fff', fontSize: 14,
          }}
        />
        <input
          type="text"
          placeholder="Team Name (optional)"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          style={{
            padding: 12, background: '#0f0f1a', border: '1px solid #333',
            borderRadius: 8, color: '#fff', fontSize: 14,
          }}
        />

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={() => handleAnnounce('runnerup')} style={{
            flex: 1, padding: '14px 20px', background: '#C0C0C0', color: '#000',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
            fontWeight: 'bold', letterSpacing: 2,
          }}>
            RUNNER UP
          </button>
          <button onClick={() => handleAnnounce('winner')} style={{
            flex: 1, padding: '14px 20px', background: '#FFD700', color: '#000',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
            fontWeight: 'bold', letterSpacing: 2,
          }}>
            WINNER
          </button>
        </div>
      </div>

      {sent && (
        <p style={{
          marginTop: 12, padding: 10, borderRadius: 6, fontSize: 13,
          background: sent.type === 'success' ? 'var(--sg-green-dim)' : 'var(--sg-red-dim)',
          color: sent.type === 'success' ? 'var(--sg-green-bright)' : 'var(--sg-red)',
        }}>{sent.message}</p>
      )}
    </div>
  );
}

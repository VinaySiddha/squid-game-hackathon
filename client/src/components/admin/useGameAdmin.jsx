import { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import socket from '../../socket';

// Shared hook for all game command centers
export default function useGameAdmin() {
  const [gameStatus, setGameStatus] = useState(null);
  const [stats, setStats] = useState({ total: 0, alive: 0, eliminated: 0, finished: 0 });
  const [lastEliminated, setLastEliminated] = useState(null);

  const fetchStatus = async () => {
    try {
      const data = await apiFetch('/game/status');
      setGameStatus(data);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
    socket.connect();

    const onEliminated = ({ playerNumber, name }) => {
      fetchStatus();
      setLastEliminated({ playerNumber, name });
      setTimeout(() => setLastEliminated(null), 3000);
    };

    socket.on('game:stats-update', fetchStatus);
    socket.on('game:player-eliminated', onEliminated);
    socket.on('game:player-finished', fetchStatus);
    socket.on('game:end', fetchStatus);

    return () => {
      socket.off('game:stats-update', fetchStatus);
      socket.off('game:player-eliminated', onEliminated);
      socket.off('game:player-finished', fetchStatus);
      socket.off('game:end', fetchStatus);
    };
  }, []);

  const createGame = async (gameType, config) => {
    try {
      await apiFetch('/game/create', {
        method: 'POST',
        body: JSON.stringify({ gameType, config }),
      });
      fetchStatus();
    } catch (err) {
      alert(err.message);
    }
  };

  const startGame = async () => {
    try {
      await apiFetch('/game/start', { method: 'POST' });
      fetchStatus();
    } catch (err) {
      alert(err.message);
    }
  };

  const endGame = async () => {
    try {
      await apiFetch('/game/end', { method: 'POST' });
      fetchStatus();
    } catch (err) {
      alert(err.message);
    }
  };

  const isActive = gameStatus?.active && gameStatus?.status !== 'finished';
  const isWaiting = gameStatus?.active && gameStatus?.status === 'waiting';
  const isPlaying = gameStatus?.active && gameStatus?.status === 'active';

  return {
    gameStatus, stats, fetchStatus,
    createGame, startGame, endGame,
    isActive, isWaiting, isPlaying,
    lastEliminated,
  };
}

// Shared styles
export const inputStyle = {
  padding: '8px 12px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  width: '100%',
};

export const labelStyle = {
  display: 'block',
  fontSize: '12px',
  color: '#888',
  marginBottom: '4px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
};

export const btnStyle = (color = '#E91E7B') => ({
  padding: '10px 20px',
  background: color,
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontFamily: 'var(--font-number)',
  fontSize: '14px',
  letterSpacing: '1px',
});

export const sectionStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '20px',
  marginBottom: '16px',
};

export function LiveStats({ stats, isWaiting, isActive, startGame, endGame, players, lastEliminated }) {
  return (
    <>
      {/* Elimination Toast */}
      {lastEliminated && (
        <div style={{
          background: 'rgba(255,0,64,0.15)', border: '1px solid rgba(255,0,64,0.3)',
          borderRadius: '10px', padding: '12px 20px', marginBottom: '12px',
          display: 'flex', alignItems: 'center', gap: '12px',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <span style={{ fontSize: '24px' }}>💀</span>
          <div>
            <span style={{ fontFamily: 'var(--font-number)', color: '#ff0040', fontSize: '16px', letterSpacing: '1px' }}>
              PLAYER {lastEliminated.playerNumber} ELIMINATED
            </span>
            <span style={{ color: '#888', fontSize: '13px', marginLeft: '8px' }}>{lastEliminated.name}</span>
          </div>
        </div>
      )}

      <div style={{ ...sectionStyle, display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div><span style={{ color: '#888', fontSize: '12px' }}>JOINED</span><br /><strong style={{ fontSize: '24px' }}>{stats.total}</strong></div>
        <div><span style={{ color: '#888', fontSize: '12px' }}>ALIVE</span><br /><strong style={{ fontSize: '24px', color: '#00ff66' }}>{stats.alive}</strong></div>
        <div><span style={{ color: '#888', fontSize: '12px' }}>ELIMINATED</span><br /><strong style={{ fontSize: '24px', color: '#ff0040' }}>{stats.eliminated}</strong></div>
        <div><span style={{ color: '#888', fontSize: '12px' }}>FINISHED</span><br /><strong style={{ fontSize: '24px', color: '#c9a84c' }}>{stats.finished}</strong></div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {isWaiting && <button style={btnStyle('#067a52')} onClick={startGame}>START GAME</button>}
          {isActive && <button style={btnStyle('#ff0040')} onClick={endGame}>END GAME</button>}
        </div>
      </div>

      {/* Player List */}
      {players && players.length > 0 && (
        <div style={{ ...sectionStyle, maxHeight: '300px', overflowY: 'auto' }}>
          <h3 style={{ fontFamily: 'var(--font-number)', fontSize: '12px', color: '#888', letterSpacing: '2px', marginBottom: '12px' }}>
            PLAYERS ({players.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
            {players.map(p => (
              <div key={p.participant_id || p.player_number} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 10px', borderRadius: '6px',
                background: p.is_eliminated ? 'rgba(255,0,64,0.08)' : p.is_finished ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${p.is_eliminated ? 'rgba(255,0,64,0.15)' : p.is_finished ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)'}`,
              }}>
                <span style={{
                  fontFamily: 'var(--font-number)', fontSize: '12px',
                  color: p.is_eliminated ? '#ff0040' : p.is_finished ? '#c9a84c' : '#00ff66',
                  minWidth: '30px',
                }}>
                  {p.player_number}
                </span>
                <span style={{ fontSize: '12px', color: p.is_eliminated ? '#666' : '#ccc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
                {p.is_eliminated && <span style={{ fontSize: '10px', color: '#ff0040' }}>&#10005;</span>}
                {p.is_finished && !p.is_eliminated && <span style={{ fontSize: '10px', color: '#c9a84c' }}>&#10003;</span>}
                {p.progress > 0 && !p.is_finished && !p.is_eliminated && (
                  <span style={{ fontSize: '10px', color: '#888', fontFamily: 'var(--font-number)' }}>{p.progress}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../socket';
import PlayerTile from '../components/PlayerTile';
import Timer from '../components/Timer';
import useAudioPlayer from '../components/useAudioPlayer';
import SquidShapes from '../components/SquidShapes';
import './Wall.css';

const TOTAL_SLOTS = 300;

export default function Wall() {
  const [participants, setParticipants] = useState([]);
  const [timerState, setTimerState] = useState({ timer_end_time: null, timer_running: false });
  const [started, setStarted] = useState(false);
  const [expired, setExpired] = useState(false);
  const audioRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch('/api/participants');
      const data = await res.json();
      setParticipants(data);
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    }

    try {
      const res = await fetch('/api/timer');
      const data = await res.json();
      setTimerState(data);
    } catch (err) {
      console.error('Failed to fetch timer:', err);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    socket.connect();

    socket.on('connect', () => {
      console.log('Wall connected to server');
    });

    socket.on('reconnect', () => {
      fetchAll();
    });

    socket.on('participant:checkin', (p) => {
      setParticipants(prev => prev.map(existing =>
        existing.player_number === p.player_number ? { ...existing, ...p } : existing
      ));
      audioRef.current?.playSFX('checkin');
    });

    socket.on('participant:eliminate', (p) => {
      setParticipants(prev => prev.map(existing =>
        existing.id === p.id ? { ...existing, is_alive: false } : existing
      ));
      audioRef.current?.playSFX('eliminate');
    });

    socket.on('participant:revive', (p) => {
      setParticipants(prev => prev.map(existing =>
        existing.id === p.id ? { ...existing, is_alive: true } : existing
      ));
    });

    socket.on('participant:eliminate-bulk', (players) => {
      const ids = new Set(players.map(p => p.id));
      setParticipants(prev => prev.map(existing =>
        ids.has(existing.id) ? { ...existing, is_alive: false } : existing
      ));
      audioRef.current?.playSFX('eliminate');
    });

    socket.on('timer:update', (state) => {
      setTimerState(state);
      setExpired(false);
    });

    return () => {
      socket.off('participant:checkin');
      socket.off('participant:eliminate');
      socket.off('participant:revive');
      socket.off('participant:eliminate-bulk');
      socket.off('timer:update');
      socket.off('reconnect');
      socket.disconnect();
    };
  }, [fetchAll]);

  const grid = [];
  const participantMap = {};
  for (const p of participants) {
    if (p.player_number) {
      participantMap[p.player_number] = p;
    }
  }
  for (let i = 1; i <= TOTAL_SLOTS; i++) {
    const num = String(i).padStart(3, '0');
    grid.push(participantMap[num] || {
      player_number: num,
      photo_url: null,
      is_alive: true,
      is_checked_in: false,
    });
  }

  const aliveCount = participants.filter(p => p.is_alive && p.is_checked_in).length;

  const handleStart = () => {
    setStarted(true);
  };

  const handleTimerExpire = useCallback(() => {
    setExpired(true);
    audioRef.current?.playSFX('timesup');
  }, []);

  const { playSFX } = useAudioPlayer({ socket: started ? socket : null, autoPlay: started });
  audioRef.current = { playSFX };

  if (!started) {
    return (
      <div className="wall-start-overlay" onClick={handleStart}>
        <SquidShapes size={40} />
        <h1>SQUID GAME</h1>
        <p>Click anywhere to start</p>
      </div>
    );
  }

  return (
    <div className="wall-container">
      <div className="wall-grid">
        {grid.map((p) => (
          <PlayerTile key={p.player_number} participant={p} />
        ))}
      </div>

      <div className={`wall-overlay ${expired ? 'wall-expired-flash' : ''}`}>
        <SquidShapes size={20} />
        <Timer
          endTime={timerState.timer_end_time}
          isRunning={timerState.timer_running}
          onExpire={handleTimerExpire}
        />
        <span className="player-count">ALIVE: {aliveCount} / {TOTAL_SLOTS}</span>
        <SquidShapes size={20} />
      </div>
    </div>
  );
}

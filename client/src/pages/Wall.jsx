import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../socket';
import PlayerTile from '../components/PlayerTile';
import Timer from '../components/Timer';
import useAudioPlayer from '../components/useAudioPlayer';
import SquidShapes from '../components/SquidShapes';
import CelebrationPopup from '../components/CelebrationPopup';
import './Wall.css';

function computeGrid(total) {
  // Find best columns x rows that fits 1920x1080 (16:9)
  // Target aspect ratio per tile ~ 1.0-1.5 (portrait-ish)
  let bestCols = 20;
  for (let cols = Math.ceil(Math.sqrt(total * 16 / 9)); cols >= 5; cols--) {
    const rows = Math.ceil(total / cols);
    if (cols * rows >= total) {
      bestCols = cols;
      break;
    }
  }
  const bestRows = Math.ceil(total / bestCols);
  return { cols: bestCols, rows: bestRows };
}

export default function Wall() {
  const [participants, setParticipants] = useState([]);
  const [totalSlots, setTotalSlots] = useState(300);
  const [timerState, setTimerState] = useState({ timer_end_time: null, timer_running: false });
  const [started, setStarted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
  const [showTimer, setShowTimer] = useState(false);
  const audioRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/total-participants');
      const data = await res.json();
      if (data.total_participants) setTotalSlots(data.total_participants);
    } catch (err) {
      console.error('Failed to fetch total participants setting:', err);
    }

    try {
      const res = await fetch('/api/participants');
      const data = await res.json();
      if (Array.isArray(data)) setParticipants(data);
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    }

    try {
      const res = await fetch('/api/timer');
      const data = await res.json();
      if (data && !data.error) setTimerState(data);
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

    socket.on('timer:show', (visible) => {
      setShowTimer(visible);
    });

    socket.on('announce', (data) => {
      setParticipants(prev => {
        const num = String(data.player_number).padStart(3, '0');
        const found = prev.find(p => p.player_number === num);
        setAnnouncement({ ...data, photo_url: found?.photo_url || null });
        return prev;
      });
    });

    return () => {
      socket.off('participant:checkin');
      socket.off('participant:eliminate');
      socket.off('participant:revive');
      socket.off('participant:eliminate-bulk');
      socket.off('timer:update');
      socket.off('timer:show');
      socket.off('announce');
      socket.off('reconnect');
      socket.disconnect();
    };
  }, [fetchAll]);

  // Only show slots that exist in DB — deleted numbers disappear from grid
  const grid = participants
    .filter(p => p.player_number)
    .sort((a, b) => a.player_number.localeCompare(b.player_number));

  const slotCount = grid.length || totalSlots;
  const { cols, rows } = computeGrid(slotCount);
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

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    width: '100%',
    height: '100%',
    gap: 0,
  };

  return (
    <div className="wall-container">
      <div style={gridStyle}>
        {grid.map((p) => (
          <PlayerTile key={p.player_number} participant={p} />
        ))}
      </div>


      {showTimer && (
        <div className="wall-timer-overlay">
          <SquidShapes size={40} />
          <div className="wall-timer-big">
            <Timer
              endTime={timerState.timer_end_time}
              isRunning={timerState.timer_running}
              onExpire={handleTimerExpire}
            />
          </div>
          <SquidShapes size={40} />
        </div>
      )}

      {announcement && (
        <CelebrationPopup
          type={announcement.type}
          playerNumber={announcement.player_number}
          name={announcement.name}
          teamName={announcement.team_name}
          photoUrl={announcement.photo_url}
          onClose={() => setAnnouncement(null)}
        />
      )}
    </div>
  );
}

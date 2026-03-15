import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../socket';
import PlayerTile from '../components/PlayerTile';
import Timer from '../components/Timer';
import useAudioPlayer from '../components/useAudioPlayer';
import SquidShapes from '../components/SquidShapes';
import CelebrationPopup from '../components/CelebrationPopup';
import './Wall.css';

function computeGrid(total) {
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
  const [mingleDice, setMingleDice] = useState(null);
  const [gameSoundsMuted, setGameSoundsMuted] = useState(false);
  const audioRef = useRef(null);
  const gameSoundsMutedRef = useRef(false);

  // Keep ref in sync with state (so socket callbacks see latest value)
  useEffect(() => { gameSoundsMutedRef.current = gameSoundsMuted; }, [gameSoundsMuted]);

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
      if (!gameSoundsMutedRef.current) audioRef.current?.playSFX('checkin');
    });

    socket.on('participant:eliminate', (p) => {
      setParticipants(prev => prev.map(existing =>
        existing.id === p.id ? { ...existing, is_alive: false } : existing
      ));
      if (!gameSoundsMutedRef.current) {
        audioRef.current?.playSFX('gunshot');
        if (p.player_number) {
          setTimeout(() => {
            audioRef.current?.playPlayerAnnouncement(p.player_number);
          }, 500);
        }
      }
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
      if (!gameSoundsMutedRef.current) audioRef.current?.playSFX('eliminate');
    });

    socket.on('timer:update', (state) => {
      setTimerState(state);
      setExpired(false);
    });

    socket.on('timer:show', (visible) => {
      setShowTimer(visible);
    });

    socket.on('panel:mute-game-sounds', (muted) => {
      setGameSoundsMuted(muted);
    });

    socket.on('announce', (data) => {
      if (data.type === 'dismiss') {
        setAnnouncement(null);
        return;
      }
      setParticipants(prev => {
        const num = String(data.player_number).padStart(3, '0');
        const found = prev.find(p => p.player_number === num);
        setAnnouncement({ ...data, player_number: num, photo_url: found?.photo_url || null });
        return prev;
      });
    });

    // ─── Game audio on cinema panel ───
    let dollBgm = null;
    let mingleSong = null;

    socket.on('game:start', (data) => {
      if (gameSoundsMutedRef.current) return;
      if (data.gameType === 'rlgl') {
        dollBgm = new Audio('/uploads/SquidGameAudios/sfx/Doll Earrape Green light Red light.mp3');
        dollBgm.loop = true;
        dollBgm.volume = 0.5;
        dollBgm.play().catch(() => {});
      }
      if (data.gameType === 'mingle') {
        mingleSong = new Audio('/audio/mingle-game-song(dunggeulge dunggeulge).mp3.mpeg');
        mingleSong.loop = true;
        mingleSong.volume = 0.5;
        mingleSong.play().catch(() => {});
      }
    });

    socket.on('game:signal', ({ signal }) => {
      if (gameSoundsMutedRef.current) return;
      if (dollBgm) {
        if (signal === 'green') {
          dollBgm.play().catch(() => {});
        } else {
          dollBgm.pause();
        }
      }
    });

    socket.on('game:mingle-round', ({ number }) => {
      if (mingleSong) mingleSong.pause();

      setMingleDice({ rolling: true, number: 0 });

      if (!gameSoundsMutedRef.current) {
        const drumroll = new Audio('/uploads/SquidGameAudios/sfx/Drum roll.mp3');
        drumroll.play().catch(() => {});
      }

      let count = 0;
      const maxCount = 30;
      const diceInterval = setInterval(() => {
        count++;
        setMingleDice({ rolling: true, number: Math.floor(Math.random() * 9) + 2 });
        if (count >= maxCount) {
          clearInterval(diceInterval);
          setMingleDice({ rolling: false, number });
          if (!gameSoundsMutedRef.current) {
            const whistle = new Audio('/uploads/SquidGameAudios/sfx/Whistle blow.mp3');
            whistle.play().catch(() => {});
          }
          setTimeout(() => setMingleDice(null), 3000);
        }
      }, 60);
    });

    socket.on('game:mingle-round-end', () => {
      if (!gameSoundsMutedRef.current && mingleSong) mingleSong.play().catch(() => {});
    });

    socket.on('game:end', () => {
      if (dollBgm) { dollBgm.pause(); dollBgm = null; }
      if (mingleSong) { mingleSong.pause(); mingleSong = null; }
      setMingleDice(null);
    });

    return () => {
      socket.off('participant:checkin');
      socket.off('participant:eliminate');
      socket.off('participant:revive');
      socket.off('participant:eliminate-bulk');
      socket.off('timer:update');
      socket.off('timer:show');
      socket.off('announce');
      socket.off('panel:mute-game-sounds');
      socket.off('game:start');
      socket.off('game:signal');
      socket.off('game:mingle-round');
      socket.off('game:mingle-round-end');
      socket.off('game:end');
      socket.off('reconnect');
      if (dollBgm) { dollBgm.pause(); dollBgm = null; }
      if (mingleSong) { mingleSong.pause(); mingleSong = null; }
      socket.disconnect();
    };
  }, [fetchAll]);

  const grid = participants
    .filter(p => p.player_number)
    .sort((a, b) => a.player_number.localeCompare(b.player_number));

  const slotCount = grid.length || totalSlots;
  const { cols, rows } = computeGrid(slotCount);

  const handleStart = () => {
    setStarted(true);
  };

  const handleTimerExpire = useCallback(() => {
    setExpired(true);
    if (!gameSoundsMutedRef.current) audioRef.current?.playSFX('timesup');
  }, []);

  // Audio player — always listen to socket (not just when started)
  // This ensures admin Audio Center tracks/SFX play on the panel
  const { playSFX, playPlayerAnnouncement } = useAudioPlayer({ socket, autoPlay: started });
  audioRef.current = { playSFX, playPlayerAnnouncement };

  if (!started) {
    return (
      <div className="wall-start-overlay" onClick={handleStart}>
        <div className="wall-start-bg" />
        <div className="wall-start-content">
          <div className="wall-start-shapes">
            <SquidShapes size={32} />
          </div>
          <h1 className="wall-start-title">SQUID GAME</h1>
          <p className="wall-start-subtitle">HACKATHON 2026</p>
          <div className="wall-start-line" />
          <p className="wall-start-prompt">Click anywhere to enter the arena</p>
        </div>
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

      {/* Mingle Dice Roll Overlay */}
      {mingleDice && (
        <div className="wall-dice-overlay">
          <div className="wall-dice-label">FORM GROUPS OF</div>
          <div className={`wall-dice ${mingleDice.rolling ? 'rolling' : 'landed'}`}>
            <span className="wall-dice-number">{mingleDice.number}</span>
          </div>
          {!mingleDice.rolling && (
            <div className="wall-dice-result-text">GO!</div>
          )}
        </div>
      )}
    </div>
  );
}

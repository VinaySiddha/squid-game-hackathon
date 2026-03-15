import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../socket';
import './TugOfWar.css';

const AUDIO_BASE = '/uploads/SquidGameAudios';
const eliminateAudio = new Audio(`${AUDIO_BASE}/core/Elimination sound effect .MP3`);
const alarmAudio = new Audio(`${AUDIO_BASE}/sfx/Alarm  siren.mp3`);
eliminateAudio.preload = 'auto';
alarmAudio.preload = 'auto';

export default function TugOfWar() {
  const [phase, setPhase] = useState('login');
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerInfo, setPlayerInfo] = useState(null);
  const [passage, setPassage] = useState('');
  const [typed, setTyped] = useState('');
  const [ropePosition, setRopePosition] = useState(50); // 0=dead, 100=safe, starts at 50
  const [eliminated, setEliminated] = useState(false);
  const [finished, setFinished] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [pullSpeed, setPullSpeed] = useState(0.3); // how fast rope drags toward elimination
  const inputRef = useRef(null);
  const dragRef = useRef(null);
  const ropeRef = useRef(50);

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'Player has been eliminated') setPhase('eliminated');
        else alert(data.error);
        return;
      }
      setPlayerInfo(data);
      socket.connect();
      socket.emit('game:join', { playerNumber: data.playerNumber });
      setPhase(data.status === 'active' ? 'playing' : 'lobby');
    } catch (err) {
      alert('Failed to join: ' + err.message);
    }
  };

  // Socket events
  useEffect(() => {
    if (phase !== 'lobby' && phase !== 'playing') return;

    const onStart = (data) => {
      const config = data.config;
      setPassage(config.passage || 'The quick brown fox jumps over the lazy dog and runs across the field.');
      setPullSpeed(config.pullSpeed || 0.3);
      setTyped('');
      setRopePosition(50);
      ropeRef.current = 50;
      setPhase('playing');
      setTimeout(() => inputRef.current?.focus(), 200);
    };

    const onEliminated = ({ playerNumber: pn }) => {
      if (pn === playerInfo?.playerNumber) {
        eliminateAudio.currentTime = 0;
        eliminateAudio.play().catch(() => {});
        const announceAudio = new Audio(`${AUDIO_BASE}/players(0-300 audios)/player_${pn}.mp3`);
        setTimeout(() => announceAudio.play().catch(() => {}), 500);
        setEliminated(true);
        setPhase('result');
      }
    };

    const onEnd = () => {
      if (!finished) setEliminated(true);
      setPhase('result');
    };

    socket.on('game:start', onStart);
    socket.on('game:player-eliminated', onEliminated);
    socket.on('game:end', onEnd);

    return () => {
      socket.off('game:start', onStart);
      socket.off('game:player-eliminated', onEliminated);
      socket.off('game:end', onEnd);
    };
  }, [phase, playerInfo, finished]);

  // Constant drag toward elimination (rope pulls down)
  useEffect(() => {
    if (phase !== 'playing' || eliminated || finished) return;

    const interval = setInterval(() => {
      ropeRef.current = Math.max(0, ropeRef.current - pullSpeed);
      setRopePosition(ropeRef.current);

      // Danger zone warning
      if (ropeRef.current < 20 && ropeRef.current > 0) {
        alarmAudio.volume = 0.3;
        // Don't spam play
      }

      // Eliminated if rope hits 0
      if (ropeRef.current <= 0) {
        clearInterval(interval);
        socket.emit('game:keystroke'); // trigger server elimination
        setEliminated(true);
        eliminateAudio.currentTime = 0;
        eliminateAudio.play().catch(() => {});
        setPhase('result');
      }
    }, 100);

    dragRef.current = interval;
    return () => clearInterval(interval);
  }, [phase, eliminated, finished, pullSpeed]);

  // Typing handler — each correct char pulls rope toward safety
  const handleKeyDown = useCallback((e) => {
    if (phase !== 'playing' || eliminated || finished) return;

    if (e.key === 'Backspace') {
      setTyped(prev => prev.slice(0, -1));
      return;
    }

    if (e.key.length === 1) {
      setTyped(prev => {
        const expectedChar = passage[prev.length];
        if (e.key !== expectedChar) {
          setWrongFlash(true);
          setTimeout(() => setWrongFlash(false), 300);
          // Wrong char PULLS rope down extra!
          ropeRef.current = Math.max(0, ropeRef.current - 2);
          setRopePosition(ropeRef.current);
          return prev;
        }

        const next = prev + e.key;
        // Each correct char pulls rope UP
        const pullUp = 2.5;
        ropeRef.current = Math.min(100, ropeRef.current + pullUp);
        setRopePosition(ropeRef.current);

        socket.emit('game:progress', { typedLength: next.length });

        if (next === passage) {
          if (dragRef.current) clearInterval(dragRef.current);
          setFinished(true);
          socket.emit('game:complete', { typedText: next });
          const victoryAudio = new Audio(`${AUDIO_BASE}/music tracks/Victory celebration music.mp3`);
          victoryAudio.play().catch(() => {});
          setPhase('result');
        }
        return next;
      });
    }
  }, [phase, eliminated, finished, passage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const progress = passage ? Math.round((typed.length / passage.length) * 100) : 0;

  // Rope color based on position
  const getRopeColor = () => {
    if (ropePosition > 60) return '#00ff66';
    if (ropePosition > 30) return '#c9a84c';
    return '#ff0040';
  };

  // ─── LOGIN ───
  if (phase === 'login') {
    return (
      <div className="tow-page">
        <div className="tow-login">
          <h1 className="tow-title">TUG OF<br/>WAR</h1>
          <p className="tow-subtitle">Enter your player number to join</p>
          <input type="text" value={playerNumber} onChange={(e) => setPlayerNumber(e.target.value)}
            placeholder="e.g. 001" className="tow-input"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <button onClick={handleLogin} className="tow-btn">JOIN GAME</button>
        </div>
      </div>
    );
  }

  if (phase === 'eliminated') {
    return (
      <div className="tow-page">
        <div className="tow-eliminated">
          <div className="tow-x">&#10005;</div>
          <h1>ELIMINATED</h1>
          <p>You have been eliminated.</p>
        </div>
      </div>
    );
  }

  if (phase === 'lobby') {
    return (
      <div className="tow-page">
        <div className="tow-lobby">
          <h1 className="tow-title">TUG OF WAR</h1>
          <p className="tow-player-badge">Player {playerInfo?.playerNumber}</p>
          <p className="tow-waiting">Waiting for the game to start...</p>
          <div className="tow-pulse-dot" />
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className={`tow-page ${finished && !eliminated ? 'tow-survive-bg' : ''}`}>
        {finished && !eliminated && (
          <div className="tow-confetti">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="tow-confetti-piece" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                backgroundColor: ['#E91E7B', '#c9a84c', '#00ff66', '#4a90d9', '#ff0040'][i % 5],
                width: `${6 + Math.random() * 6}px`, height: `${6 + Math.random() * 6}px`,
              }} />
            ))}
          </div>
        )}
        <div className={`tow-result ${finished && !eliminated ? 'survived' : 'dead'}`}>
          <div className={`tow-result-icon ${finished && !eliminated ? 'tow-bounce' : ''}`}>
            {finished && !eliminated ? '\u2713' : '\u2717'}
          </div>
          <h1>{finished && !eliminated ? 'YOU SURVIVED!' : 'ELIMINATED'}</h1>
          <p>{finished && !eliminated ? 'You pulled the rope to safety!' : 'The rope dragged you down.'}</p>
          <p className="tow-result-progress">Progress: {progress}%</p>
          {finished && !eliminated && <p className="tow-result-badge">Player {playerInfo?.playerNumber}</p>}
        </div>
      </div>
    );
  }

  // ─── PLAYING ───
  return (
    <div className={`tow-page tow-playing ${ropePosition < 20 ? 'tow-danger' : ''}`}>
      {/* Rope visualization */}
      <div className="tow-rope-section">
        <div className="tow-rope-label-safe">SAFE</div>
        <div className="tow-rope-track-v">
          <div className="tow-rope-danger-zone" />
          <div
            className="tow-rope-marker-v"
            style={{
              bottom: `${ropePosition}%`,
              backgroundColor: getRopeColor(),
              boxShadow: `0 0 20px ${getRopeColor()}`,
            }}
          />
          <div className="tow-rope-line" style={{ height: `${ropePosition}%`, backgroundColor: getRopeColor() }} />
        </div>
        <div className="tow-rope-label-elim">FALL</div>
      </div>

      {/* Main content */}
      <div className="tow-main">
        <h2 className="tow-game-tag">TUG OF WAR</h2>
        <p className="tow-game-hint">Type to pull yourself up! Wrong keys drag you down!</p>

        <div className="tow-passage">
          {passage.split('').map((char, i) => {
            let cls = 'tow-char';
            if (i < typed.length) cls += ' correct';
            else if (i === typed.length) {
              cls += ' cursor';
              if (wrongFlash) cls += ' wrong-flash';
            }
            return <span key={i} className={cls}>{char === ' ' ? '\u00A0' : char}</span>;
          })}
        </div>

        <div className="tow-progress-bar">
          <div className="tow-progress-fill" style={{ width: `${progress}%` }} />
          <span className="tow-progress-text">{progress}%</span>
        </div>
      </div>

      <input ref={inputRef} className="tow-hidden-input" autoFocus />
    </div>
  );
}

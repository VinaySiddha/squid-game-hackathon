import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../socket';
import './MingleGame.css';

const AUDIO_BASE = '/uploads/SquidGameAudios';
const MINGLE_SONG_URL = '/audio/mingle-game-song(dunggeulge dunggeulge).mp3.mpeg';
const eliminateAudio = new Audio(`${AUDIO_BASE}/core/Elimination sound effect .MP3`);
const drumrollAudio = new Audio(`${AUDIO_BASE}/sfx/Drum roll.mp3`);
const whistleAudio = new Audio(`${AUDIO_BASE}/sfx/Whistle blow.mp3`);
eliminateAudio.preload = 'auto';
drumrollAudio.preload = 'auto';
whistleAudio.preload = 'auto';

// Passages pool — server picks one, but we define display logic client-side
const PASSAGES = [
  'The quick brown fox jumps over the lazy dog near the riverbank.',
  'In the game of survival only the smartest and fastest will remain.',
  'Every player has a number and every number has a story to tell.',
  'Fortune favors the bold but patience rewards the wise in the end.',
  'The glass bridge stretches forward into darkness step by careful step.',
];

export default function MingleGame() {
  const [phase, setPhase] = useState('login');
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerInfo, setPlayerInfo] = useState(null);
  const [passage, setPassage] = useState('');
  const [visibleChars, setVisibleChars] = useState([]); // true/false per char
  const [typed, setTyped] = useState('');
  const [timerEnd, setTimerEnd] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [eliminated, setEliminated] = useState(false);
  const [finished, setFinished] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [disappearStarted, setDisappearStarted] = useState(false);
  const [round, setRound] = useState(0);
  const songRef = useRef(null);
  const disappearRef = useRef(null);
  const inputRef = useRef(null);

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

  // Start disappearing words after delay
  const startDisappearing = useCallback((text) => {
    const chars = text.split('');
    const visible = chars.map(() => true);
    setVisibleChars([...visible]);
    setDisappearStarted(false);

    // After 4 seconds, start hiding characters
    const startTimeout = setTimeout(() => {
      setDisappearStarted(true);
      let remaining = chars.map((_, i) => i).filter(i => chars[i] !== ' ');
      // Shuffle
      remaining.sort(() => Math.random() - 0.5);

      let idx = 0;
      const interval = setInterval(() => {
        if (idx >= remaining.length) {
          clearInterval(interval);
          return;
        }
        // Hide 2-3 chars at a time
        const batch = Math.min(2 + Math.floor(Math.random() * 2), remaining.length - idx);
        setVisibleChars(prev => {
          const next = [...prev];
          for (let b = 0; b < batch && idx + b < remaining.length; b++) {
            next[remaining[idx + b]] = false;
          }
          return next;
        });
        idx += batch;
      }, 800);

      disappearRef.current = interval;
    }, 4000);

    return () => {
      clearTimeout(startTimeout);
      if (disappearRef.current) clearInterval(disappearRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'lobby' && phase !== 'playing') return;

    const onStart = (data) => {
      const config = data.config;
      const text = config.passage || PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
      setPassage(text);
      setTyped('');
      setRound(1);
      setTimerEnd(Date.now() + data.timerDurationMs);
      setPhase('playing');

      if (!songRef.current) {
        songRef.current = new Audio(MINGLE_SONG_URL);
        songRef.current.loop = true;
        songRef.current.volume = 0.3;
      }
      songRef.current.currentTime = 0;
      songRef.current.play().catch(() => {});

      // Start the disappearing mechanic
      startDisappearing(text);
      setTimeout(() => inputRef.current?.focus(), 200);
    };

    const onEliminated = ({ playerNumber: pn }) => {
      if (pn === playerInfo?.playerNumber) {
        if (songRef.current) songRef.current.pause();
        eliminateAudio.currentTime = 0;
        eliminateAudio.play().catch(() => {});
        const announceAudio = new Audio(`${AUDIO_BASE}/players(0-300 audios)/player_${pn}.mp3`);
        setTimeout(() => announceAudio.play().catch(() => {}), 500);
        setEliminated(true);
        setPhase('result');
      }
    };

    const onEnd = () => {
      if (songRef.current) songRef.current.pause();
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
  }, [phase, playerInfo, finished, startDisappearing]);

  useEffect(() => {
    return () => {
      if (songRef.current) { songRef.current.pause(); songRef.current = null; }
      if (disappearRef.current) clearInterval(disappearRef.current);
    };
  }, []);

  // Timer
  useEffect(() => {
    if (!timerEnd || phase !== 'playing') return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, timerEnd - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [timerEnd, phase]);

  // Typing handler
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
          return prev;
        }

        const next = prev + e.key;
        socket.emit('game:progress', { typedLength: next.length });

        if (next === passage) {
          if (songRef.current) songRef.current.pause();
          if (disappearRef.current) clearInterval(disappearRef.current);
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

  const formatTime = (ms) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const progress = passage ? Math.round((typed.length / passage.length) * 100) : 0;

  // ─── LOGIN ───
  if (phase === 'login') {
    return (
      <div className="mingle-page">
        <div className="mingle-login">
          <h1 className="mingle-title">DISAPPEARING<br/>TEXT</h1>
          <p className="mingle-subtitle">Enter your player number to join</p>
          <input type="text" value={playerNumber} onChange={(e) => setPlayerNumber(e.target.value)}
            placeholder="e.g. 001" className="mingle-input"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <button onClick={handleLogin} className="mingle-btn">JOIN GAME</button>
        </div>
      </div>
    );
  }

  if (phase === 'eliminated') {
    return (
      <div className="mingle-page">
        <div className="mingle-eliminated">
          <div className="mingle-x">&#10005;</div>
          <h1>ELIMINATED</h1>
          <p>You have been eliminated.</p>
        </div>
      </div>
    );
  }

  if (phase === 'lobby') {
    return (
      <div className="mingle-page">
        <div className="mingle-lobby">
          <h1 className="mingle-title">DISAPPEARING TEXT</h1>
          <p className="mingle-player-badge">Player {playerInfo?.playerNumber}</p>
          <p className="mingle-waiting">Waiting for the game to start...</p>
          <div className="mingle-pulse-dot" />
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className={`mingle-page ${finished ? 'mingle-survive-bg' : ''}`}>
        {finished && (
          <div className="mingle-confetti">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="mingle-confetti-piece" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                backgroundColor: ['#E91E7B', '#c9a84c', '#00ff66', '#4a90d9', '#ff0040'][i % 5],
                width: `${6 + Math.random() * 6}px`, height: `${6 + Math.random() * 6}px`,
              }} />
            ))}
          </div>
        )}
        <div className={`mingle-result ${!finished || eliminated ? 'dead' : 'survived'}`}>
          <div className={`mingle-result-icon ${finished ? 'mingle-bounce' : ''}`}>{finished && !eliminated ? '\u2713' : '\u2717'}</div>
          <h1>{finished && !eliminated ? 'YOU SURVIVED!' : 'ELIMINATED'}</h1>
          <p>{finished && !eliminated ? 'You typed the passage from memory!' : 'Time ran out or you were eliminated.'}</p>
          <p className="mingle-result-progress">Progress: {progress}%</p>
          {finished && !eliminated && <p className="mingle-result-badge">Player {playerInfo?.playerNumber}</p>}
        </div>
      </div>
    );
  }

  // ─── PLAYING ───
  return (
    <div className="mingle-page mingle-playing">
      <div className="mingle-game-label">
        <span className="mingle-game-tag">DISAPPEARING TEXT</span>
        {!disappearStarted && <span className="mingle-game-hint">Memorize the text — it will start vanishing!</span>}
        {disappearStarted && <span className="mingle-game-hint mingle-warning">Words are disappearing! Keep typing!</span>}
      </div>

      <div className="mingle-passage">
        {passage.split('').map((char, i) => {
          let cls = 'mingle-char';
          if (i < typed.length) {
            cls += ' correct';
          } else if (i === typed.length) {
            cls += ' cursor';
            if (wrongFlash) cls += ' wrong-flash';
          } else if (!visibleChars[i]) {
            cls += ' hidden';
          }
          return <span key={i} className={cls}>{char === ' ' ? '\u00A0' : char}</span>;
        })}
      </div>

      <div className="mingle-progress-bar">
        <div className="mingle-progress-fill" style={{ width: `${progress}%` }} />
        <span className="mingle-progress-text">{progress}%</span>
      </div>

      <input ref={inputRef} className="mingle-hidden-input" autoFocus />
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../socket';
import './RedLightGreenLight.css';

const AUDIO_BASE = '/uploads/SquidGameAudios';
const dollSongAudio = new Audio(`${AUDIO_BASE}/sfx/Doll Earrape Green light Red light.mp3`);
const greenLightAudio = new Audio(`${AUDIO_BASE}/sfx/Green Light.mp3`);
const redLightAudio = new Audio(`${AUDIO_BASE}/sfx/Red Light.mp3`);
const eliminateAudio = new Audio(`${AUDIO_BASE}/core/Elimination sound effect .MP3`);
const gunShotAudio = new Audio(`${AUDIO_BASE}/sfx/gunshot.mp3`);
dollSongAudio.preload = 'auto';
dollSongAudio.loop = true;
dollSongAudio.volume = 0.4;
greenLightAudio.preload = 'auto';
redLightAudio.preload = 'auto';
eliminateAudio.preload = 'auto';
gunShotAudio.preload = 'auto';

export default function RedLightGreenLight() {
  const [phase, setPhase] = useState('login');
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerInfo, setPlayerInfo] = useState(null);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [signal, setSignal] = useState('green');
  const [passage, setPassage] = useState('');
  const [typed, setTyped] = useState('');
  const [timerEnd, setTimerEnd] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [maxStrikes, setMaxStrikes] = useState(1);
  const [eliminationMode, setEliminationMode] = useState('instant');
  const [eliminated, setEliminated] = useState(false);
  const [finished, setFinished] = useState(false);
  const [gameResult, setGameResult] = useState(null);
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
        if (data.error === 'Player has been eliminated') {
          setPhase('eliminated');
        } else {
          alert(data.error);
        }
        return;
      }
      setPlayerInfo(data);
      socket.connect();
      socket.emit('game:join', { playerNumber: data.playerNumber });

      if (data.status === 'active') {
        setPhase('playing');
      } else {
        setPhase('lobby');
      }
    } catch (err) {
      alert('Failed to join: ' + err.message);
    }
  };

  // Socket events
  useEffect(() => {
    if (phase !== 'lobby' && phase !== 'playing') return;

    const onStart = (data) => {
      setPassage(data.config.passage);
      setEliminationMode(data.config.eliminationMode || 'instant');
      setMaxStrikes(data.config.strikeCount || 1);
      const endTime = Date.now() + data.timerDurationMs;
      setTimerEnd(endTime);
      setPhase('playing');
      setTimeout(() => inputRef.current?.focus(), 100);
      // Start the doll BGM (Mugunghwa song)
      dollSongAudio.currentTime = 0;
      dollSongAudio.play().catch(() => {});
    };

    const onSignal = ({ signal: s }) => {
      setSignal(s);
      if (s === 'green') {
        // Green light: doll song plays (singing = you can move/type)
        greenLightAudio.currentTime = 0;
        greenLightAudio.play().catch(() => {});
        dollSongAudio.play().catch(() => {});
      } else {
        // Red light: doll song stops (silence = freeze!)
        redLightAudio.currentTime = 0;
        redLightAudio.play().catch(() => {});
        dollSongAudio.pause();
      }
    };

    const onStrike = ({ strikes: s, max }) => {
      setStrikes(s);
      setMaxStrikes(max);
    };

    const onEliminated = ({ playerNumber: pn }) => {
      if (pn === playerInfo?.playerNumber) {
        dollSongAudio.pause();
        gunShotAudio.currentTime = 0;
        gunShotAudio.play().catch(() => {});
        // Play "Player XXX eliminated" announcement
        const announceAudio = new Audio(`${AUDIO_BASE}/players(0-300 audios)/player_${pn}.mp3`);
        setTimeout(() => announceAudio.play().catch(() => {}), 500);
        setEliminated(true);
        setPhase('result');
      }
    };

    const onEnd = (data) => {
      dollSongAudio.pause();
      setGameResult(data);
      setPhase('result');
    };

    socket.on('game:start', onStart);
    socket.on('game:signal', onSignal);
    socket.on('game:strike', onStrike);
    socket.on('game:player-eliminated', onEliminated);
    socket.on('game:end', onEnd);

    return () => {
      socket.off('game:start', onStart);
      socket.off('game:signal', onSignal);
      socket.off('game:strike', onStrike);
      socket.off('game:player-eliminated', onEliminated);
      socket.off('game:end', onEnd);
    };
  }, [phase, playerInfo]);

  // Timer countdown
  useEffect(() => {
    if (!timerEnd || phase !== 'playing') return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, timerEnd - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [timerEnd, phase]);

  // Handle typing
  const handleKeyDown = useCallback((e) => {
    if (phase !== 'playing' || eliminated || finished) return;

    // Send keystroke to server for red-light check
    socket.emit('game:keystroke');

    if (signal === 'red') {
      e.preventDefault();
      return;
    }

    if (e.key === 'Backspace') {
      setTyped(prev => prev.slice(0, -1));
      return;
    }

    if (e.key.length === 1) {
      setTyped(prev => {
        // Only accept the character if it matches the next expected character
        const expectedChar = passage[prev.length];
        if (e.key !== expectedChar) {
          // Wrong character — flash red, don't add
          setWrongFlash(true);
          setTimeout(() => setWrongFlash(false), 300);
          return prev;
        }

        const next = prev + e.key;
        socket.emit('game:progress', { typedLength: next.length });

        if (next === passage) {
          dollSongAudio.pause();
          setFinished(true);
          socket.emit('game:complete', { typedText: next });
          // Play victory sound
          const victoryAudio = new Audio(`${AUDIO_BASE}/music tracks/Victory celebration music.mp3`);
          victoryAudio.play().catch(() => {});
          setPhase('result');
        }
        return next;
      });
    }
  }, [phase, signal, eliminated, finished, passage]);

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
      <div className="rlgl-page">
        <div className="rlgl-login">
          <h1 className="rlgl-title">RED LIGHT<br/>GREEN LIGHT</h1>
          <p className="rlgl-subtitle">Enter your player number to join</p>
          <input
            type="text"
            value={playerNumber}
            onChange={(e) => setPlayerNumber(e.target.value)}
            placeholder="e.g. 001"
            className="rlgl-input"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button onClick={handleLogin} className="rlgl-btn">JOIN GAME</button>
        </div>
      </div>
    );
  }

  // ─── ELIMINATED ───
  if (phase === 'eliminated') {
    return (
      <div className="rlgl-page">
        <div className="rlgl-eliminated-screen">
          <div className="rlgl-x-icon">&#10005;</div>
          <h1>ELIMINATED</h1>
          <p>You have been eliminated from the game.</p>
        </div>
      </div>
    );
  }

  // ─── LOBBY ───
  if (phase === 'lobby') {
    return (
      <div className="rlgl-page">
        <div className="rlgl-lobby">
          <h1 className="rlgl-title">RED LIGHT<br/>GREEN LIGHT</h1>
          <p className="rlgl-player-badge">Player {playerInfo?.playerNumber}</p>
          <p className="rlgl-waiting">Waiting for the game to start...</p>
          <div className="rlgl-pulse-dot" />
        </div>
      </div>
    );
  }

  // ─── RESULT ───
  if (phase === 'result') {
    return (
      <div className={`rlgl-page ${finished ? 'rlgl-survive-bg' : ''}`}>
        {/* Confetti for survivors */}
        {finished && (
          <div className="rlgl-confetti">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="rlgl-confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 3}s`,
                  backgroundColor: ['#E91E7B', '#c9a84c', '#00ff66', '#4a90d9', '#ff0040'][i % 5],
                  width: `${6 + Math.random() * 6}px`,
                  height: `${6 + Math.random() * 6}px`,
                }}
              />
            ))}
          </div>
        )}

        <div className={`rlgl-result ${finished ? 'survived' : 'dead'}`}>
          {finished ? (
            <>
              <div className="rlgl-result-icon rlgl-bounce">&#10003;</div>
              <h1>YOU SURVIVED!</h1>
              <p>You completed the passage in time.</p>
              <p className="rlgl-result-badge">Player {playerInfo?.playerNumber}</p>
            </>
          ) : (
            <>
              <div className="rlgl-result-icon">&#10005;</div>
              <h1>ELIMINATED</h1>
              <p>You typed during red light or time ran out.</p>
              <p className="rlgl-result-progress">Progress: {progress}%</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── PLAYING ───
  return (
    <div className={`rlgl-page ${signal === 'red' ? 'rlgl-red-bg' : 'rlgl-green-bg'}`}>
      <div className={`rlgl-signal ${signal}`}>
        <div className="rlgl-signal-light" />
        <span className="rlgl-signal-text">{signal === 'green' ? 'GREEN LIGHT' : 'RED LIGHT'}</span>
      </div>

      <div className="rlgl-timer">{formatTime(timeLeft)}</div>

      {eliminationMode === 'strikes' && (
        <div className="rlgl-strikes">
          Strikes: {strikes} / {maxStrikes}
        </div>
      )}

      <div className="rlgl-passage">
        {passage.split('').map((char, i) => {
          let cls = 'rlgl-char';
          if (i < typed.length) {
            cls += ' correct';
          } else if (i === typed.length) {
            cls += ' cursor';
            if (wrongFlash) cls += ' wrong-flash';
          }
          return <span key={i} className={cls}>{char === ' ' ? '\u00A0' : char}</span>;
        })}
      </div>

      <div className="rlgl-progress-bar">
        <div className="rlgl-progress-fill" style={{ width: `${progress}%` }} />
        <span className="rlgl-progress-text">{progress}%</span>
      </div>

      <input ref={inputRef} className="rlgl-hidden-input" autoFocus />
    </div>
  );
}

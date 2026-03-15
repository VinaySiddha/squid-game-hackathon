import { useState, useEffect } from 'react';
import socket from '../socket';
import './GlassBridge.css';

export default function GlassBridge() {
  const [phase, setPhase] = useState('login');
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerInfo, setPlayerInfo] = useState(null);
  const [totalSteps, setTotalSteps] = useState(10);
  const [currentStep, setCurrentStep] = useState(0);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [stepHistory, setStepHistory] = useState([]); // { step, choice, result, playerNumber }
  const [eliminated, setEliminated] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timerEnd, setTimerEnd] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [choosing, setChoosing] = useState(false);

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

  useEffect(() => {
    if (phase !== 'lobby' && phase !== 'playing') return;

    const onStart = (data) => {
      setTotalSteps(data.config.steps || 10);
      setTimerEnd(Date.now() + data.timerDurationMs);
      setPhase('playing');
    };

    const onNextPlayer = ({ playerNumber: pn, name }) => {
      setCurrentPlayer({ playerNumber: pn, name });
      setCurrentStep(0);
      setChoosing(false);
      if (pn === playerInfo?.playerNumber) {
        setIsMyTurn(true);
      } else {
        setIsMyTurn(false);
      }
    };

    const onBridgeStep = ({ playerNumber: pn, step, choice, result }) => {
      setStepHistory(prev => [...prev, { step, choice, result, playerNumber: pn }]);
      setCurrentStep(step + 1);
      setChoosing(false);

      if (result === 'fall' && pn === playerInfo?.playerNumber) {
        setEliminated(true);
        setTimeout(() => setPhase('result'), 1500);
      }
    };

    const onPlayerFinished = ({ playerNumber: pn }) => {
      if (pn === playerInfo?.playerNumber) {
        setFinished(true);
        setPhase('result');
      }
    };

    const onEliminated = ({ playerNumber: pn }) => {
      if (pn === playerInfo?.playerNumber) {
        setEliminated(true);
        setPhase('result');
      }
    };

    const onEnd = () => setPhase('result');

    socket.on('game:start', onStart);
    socket.on('game:bridge-next-player', onNextPlayer);
    socket.on('game:bridge-step', onBridgeStep);
    socket.on('game:player-finished', onPlayerFinished);
    socket.on('game:player-eliminated', onEliminated);
    socket.on('game:end', onEnd);

    return () => {
      socket.off('game:start', onStart);
      socket.off('game:bridge-next-player', onNextPlayer);
      socket.off('game:bridge-step', onBridgeStep);
      socket.off('game:player-finished', onPlayerFinished);
      socket.off('game:player-eliminated', onEliminated);
      socket.off('game:end', onEnd);
    };
  }, [phase, playerInfo]);

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

  const makeChoice = (choice) => {
    if (!isMyTurn || choosing) return;
    setChoosing(true);
    socket.emit('game:bridge-choice', { choice });
  };

  const formatTime = (ms) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  // Check history to know which panels were revealed
  const getStepInfo = (stepIdx) => {
    const entries = stepHistory.filter(h => h.step === stepIdx);
    return entries;
  };

  if (phase === 'login') {
    return (
      <div className="bridge-page">
        <div className="bridge-login">
          <h1 className="bridge-title">GLASS<br/>BRIDGE</h1>
          <p className="bridge-subtitle">Enter your player number to join</p>
          <input
            type="text" value={playerNumber}
            onChange={(e) => setPlayerNumber(e.target.value)}
            placeholder="e.g. 001" className="bridge-input"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button onClick={handleLogin} className="bridge-btn">JOIN GAME</button>
        </div>
      </div>
    );
  }

  if (phase === 'eliminated') {
    return (
      <div className="bridge-page">
        <div className="bridge-eliminated">
          <div className="bridge-x">&#10005;</div>
          <h1>ELIMINATED</h1>
          <p>You stepped on the wrong panel.</p>
        </div>
      </div>
    );
  }

  if (phase === 'lobby') {
    return (
      <div className="bridge-page">
        <div className="bridge-lobby">
          <h1 className="bridge-title">GLASS BRIDGE</h1>
          <p className="bridge-player-badge">Player {playerInfo?.playerNumber}</p>
          <p className="bridge-waiting">Waiting for the game to start...</p>
          <div className="bridge-pulse-dot" />
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className="bridge-page">
        <div className={`bridge-result ${finished ? 'survived' : 'dead'}`}>
          <div className="bridge-result-icon">{finished ? '\u2713' : '\u2717'}</div>
          <h1>{finished ? 'YOU SURVIVED!' : 'ELIMINATED'}</h1>
          <p>{finished ? 'You crossed the glass bridge.' : 'You fell through the glass.'}</p>
        </div>
      </div>
    );
  }

  // ─── PLAYING ───
  return (
    <div className="bridge-page bridge-playing">
      <div className="bridge-timer">{formatTime(timeLeft)}</div>

      {currentPlayer && (
        <div className="bridge-current-player">
          {isMyTurn ? (
            <h2 className="bridge-your-turn">YOUR TURN</h2>
          ) : (
            <h2 className="bridge-spectating">
              Watching: Player {currentPlayer.playerNumber} ({currentPlayer.name})
            </h2>
          )}
        </div>
      )}

      <div className="bridge-track">
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const info = getStepInfo(idx);
          const isCurrentStep = idx === currentStep && isMyTurn;
          const revealed = info.length > 0;
          const lastEntry = info[info.length - 1];

          return (
            <div key={idx} className={`bridge-step ${idx < currentStep ? 'passed' : ''} ${isCurrentStep ? 'active' : ''}`}>
              <span className="bridge-step-num">{idx + 1}</span>
              <div className="bridge-panels">
                <button
                  className={`bridge-panel bridge-panel-left ${
                    revealed && lastEntry?.choice === 'left'
                      ? lastEntry.result === 'safe' ? 'safe' : 'broken'
                      : ''
                  }`}
                  onClick={() => isCurrentStep && makeChoice('left')}
                  disabled={!isCurrentStep || choosing}
                >
                  {revealed && lastEntry?.choice === 'left' && lastEntry.result === 'broken' ? '💥' : ''}
                  {revealed && lastEntry?.choice === 'left' && lastEntry.result === 'safe' ? '✓' : ''}
                </button>
                <button
                  className={`bridge-panel bridge-panel-right ${
                    revealed && lastEntry?.choice === 'right'
                      ? lastEntry.result === 'safe' ? 'safe' : 'broken'
                      : ''
                  }`}
                  onClick={() => isCurrentStep && makeChoice('right')}
                  disabled={!isCurrentStep || choosing}
                >
                  {revealed && lastEntry?.choice === 'right' && lastEntry.result === 'broken' ? '💥' : ''}
                  {revealed && lastEntry?.choice === 'right' && lastEntry.result === 'safe' ? '✓' : ''}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

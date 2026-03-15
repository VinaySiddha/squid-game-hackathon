import { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import socket from '../../socket';
import useGameAdmin, { inputStyle, labelStyle, btnStyle, sectionStyle, LiveStats } from './useGameAdmin';

export default function Level1Controls() {
  const { gameStatus, stats, createGame, startGame, endGame, isActive, isWaiting, isPlaying, lastEliminated } = useGameAdmin();

  const [presets, setPresets] = useState([]);
  const [passage, setPassage] = useState('');
  const [signalMode, setSignalMode] = useState('auto');
  const [autoGreenMin, setAutoGreenMin] = useState(3);
  const [autoGreenMax, setAutoGreenMax] = useState(8);
  const [autoRedMin, setAutoRedMin] = useState(2);
  const [autoRedMax, setAutoRedMax] = useState(5);
  const [eliminationMode, setEliminationMode] = useState('instant');
  const [strikeCount, setStrikeCount] = useState(3);
  const [timerDuration, setTimerDuration] = useState(120);
  const [currentSignal, setCurrentSignal] = useState('green');

  useEffect(() => {
    apiFetch('/game/presets').then(setPresets).catch(() => {});
    socket.on('game:signal', ({ signal }) => setCurrentSignal(signal));
    return () => socket.off('game:signal');
  }, []);

  useEffect(() => {
    if (gameStatus?.currentSignal) setCurrentSignal(gameStatus.currentSignal);
  }, [gameStatus]);

  const toggleSignal = async () => {
    const next = currentSignal === 'green' ? 'red' : 'green';
    try {
      await apiFetch('/game/signal', { method: 'POST', body: JSON.stringify({ signal: next }) });
      setCurrentSignal(next);
    } catch (err) { alert(err.message); }
  };

  const isThisGame = gameStatus?.gameType === 'rlgl';
  const showConfig = !isActive || !isThisGame;
  const showControls = isActive && isThisGame;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-number)', color: '#E91E7B', letterSpacing: '3px', marginBottom: '8px' }}>
        LEVEL 1 — COMMAND CENTER
      </h1>
      <h2 style={{ fontFamily: 'var(--font-number)', color: '#888', fontSize: '14px', letterSpacing: '2px', marginBottom: '24px' }}>
        RED LIGHT, GREEN LIGHT
      </h2>

      {showControls && (
        <>
          <LiveStats stats={stats} isWaiting={isWaiting} isActive={isActive} startGame={startGame} endGame={endGame} players={gameStatus?.players} lastEliminated={lastEliminated} />

          {/* Signal Control */}
          {isPlaying && gameStatus?.config?.signalMode === 'manual' && (
            <div style={{ ...sectionStyle, textAlign: 'center' }}>
              <p style={{ color: '#888', marginBottom: '12px', fontSize: '12px', letterSpacing: '1px' }}>SIGNAL CONTROL</p>
              <button
                onClick={toggleSignal}
                style={{
                  width: '140px', height: '140px', borderRadius: '50%',
                  border: '4px solid rgba(255,255,255,0.2)',
                  background: currentSignal === 'green'
                    ? 'radial-gradient(circle, #00ff66, #006622)'
                    : 'radial-gradient(circle, #ff0040, #660019)',
                  color: '#fff', fontSize: '18px', fontFamily: 'var(--font-number)',
                  cursor: 'pointer', letterSpacing: '2px',
                  boxShadow: currentSignal === 'green'
                    ? '0 0 50px rgba(0,255,102,0.5)'
                    : '0 0 50px rgba(255,0,64,0.5)',
                }}
              >
                {currentSignal === 'green' ? 'GREEN' : 'RED'}
              </button>
              <p style={{ color: '#888', marginTop: '8px', fontSize: '11px' }}>Click to toggle</p>
            </div>
          )}

          {isPlaying && gameStatus?.config?.signalMode === 'auto' && (
            <div style={{ ...sectionStyle, textAlign: 'center' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 12px',
                background: currentSignal === 'green' ? '#00ff66' : '#ff0040',
                boxShadow: currentSignal === 'green'
                  ? '0 0 40px rgba(0,255,102,0.5)'
                  : '0 0 40px rgba(255,0,64,0.5)',
                transition: 'all 0.3s',
              }} />
              <p style={{ fontFamily: 'var(--font-number)', fontSize: '20px', color: currentSignal === 'green' ? '#00ff66' : '#ff0040', letterSpacing: '3px' }}>
                {currentSignal === 'green' ? 'GREEN LIGHT' : 'RED LIGHT'}
              </p>
              <p style={{ color: '#888', fontSize: '11px', marginTop: '4px' }}>Auto mode active</p>
            </div>
          )}
        </>
      )}

      {showConfig && (
        <div style={sectionStyle}>
          <h3 style={{ color: '#E91E7B', fontFamily: 'var(--font-number)', marginBottom: '16px', letterSpacing: '1px' }}>CONFIGURE GAME</h3>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Passage</label>
            <select
              style={{ ...inputStyle, marginBottom: '8px' }}
              onChange={(e) => {
                const preset = presets.find(p => p.id === parseInt(e.target.value));
                if (preset) setPassage(preset.text);
              }}
              defaultValue=""
            >
              <option value="">-- Select Preset --</option>
              {presets.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <textarea
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              placeholder="Or type a custom passage..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Signal Mode</label>
              <select style={inputStyle} value={signalMode} onChange={(e) => setSignalMode(e.target.value)}>
                <option value="manual">Manual</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Timer (seconds)</label>
              <input type="number" style={inputStyle} value={timerDuration} onChange={(e) => setTimerDuration(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          {signalMode === 'auto' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div><label style={labelStyle}>Green Min (s)</label><input type="number" style={inputStyle} value={autoGreenMin} onChange={(e) => setAutoGreenMin(parseInt(e.target.value) || 1)} /></div>
              <div><label style={labelStyle}>Green Max (s)</label><input type="number" style={inputStyle} value={autoGreenMax} onChange={(e) => setAutoGreenMax(parseInt(e.target.value) || 1)} /></div>
              <div><label style={labelStyle}>Red Min (s)</label><input type="number" style={inputStyle} value={autoRedMin} onChange={(e) => setAutoRedMin(parseInt(e.target.value) || 1)} /></div>
              <div><label style={labelStyle}>Red Max (s)</label><input type="number" style={inputStyle} value={autoRedMax} onChange={(e) => setAutoRedMax(parseInt(e.target.value) || 1)} /></div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Elimination</label>
              <select style={inputStyle} value={eliminationMode} onChange={(e) => setEliminationMode(e.target.value)}>
                <option value="instant">Instant Kill</option>
                <option value="strikes">Strikes</option>
              </select>
            </div>
            {eliminationMode === 'strikes' && (
              <div>
                <label style={labelStyle}>Strike Count</label>
                <input type="number" style={inputStyle} value={strikeCount} min={1} max={10} onChange={(e) => setStrikeCount(parseInt(e.target.value) || 1)} />
              </div>
            )}
          </div>

          <button
            style={btnStyle('#E91E7B')}
            onClick={() => createGame('rlgl', {
              passage, signalMode, autoGreenMin, autoGreenMax, autoRedMin, autoRedMax,
              eliminationMode, strikeCount, timerDuration,
            })}
            disabled={!passage}
          >
            CREATE GAME
          </button>
        </div>
      )}
    </div>
  );
}

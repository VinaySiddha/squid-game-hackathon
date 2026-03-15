import { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import useGameAdmin, { inputStyle, labelStyle, btnStyle, sectionStyle, LiveStats } from './useGameAdmin';

export default function Level3Controls() {
  const { gameStatus, stats, createGame, startGame, endGame, isActive, isWaiting, isPlaying, lastEliminated } = useGameAdmin();

  const [presets, setPresets] = useState([]);
  const [passage, setPassage] = useState('');
  const [pullSpeed, setPullSpeed] = useState(0.3);
  const [timerDuration, setTimerDuration] = useState(120);

  useEffect(() => {
    apiFetch('/game/presets').then(setPresets).catch(() => {});
  }, []);

  const isThisGame = gameStatus?.gameType === 'tugofwar';
  const showConfig = !isActive || !isThisGame;
  const showControls = isActive && isThisGame;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-number)', color: '#067a52', letterSpacing: '3px', marginBottom: '8px' }}>
        LEVEL 3 — COMMAND CENTER
      </h1>
      <h2 style={{ fontFamily: 'var(--font-number)', color: '#888', fontSize: '14px', letterSpacing: '2px', marginBottom: '24px' }}>
        TUG OF WAR
      </h2>

      {showControls && (
        <LiveStats stats={stats} isWaiting={isWaiting} isActive={isActive} startGame={startGame} endGame={endGame} players={gameStatus?.players} lastEliminated={lastEliminated} />
      )}

      {showConfig && (
        <div style={sectionStyle}>
          <h3 style={{ color: '#067a52', fontFamily: 'var(--font-number)', marginBottom: '16px', letterSpacing: '1px' }}>CONFIGURE GAME</h3>
          <p style={{ color: '#888', fontSize: '12px', marginBottom: '16px' }}>
            Players type a passage while a force constantly pulls them toward elimination. Type fast to stay alive — wrong keys drag you down faster.
          </p>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Pull Speed (difficulty)</label>
              <select style={inputStyle} value={pullSpeed} onChange={(e) => setPullSpeed(parseFloat(e.target.value))}>
                <option value="0.15">Easy (slow drag)</option>
                <option value="0.3">Medium</option>
                <option value="0.5">Hard (fast drag)</option>
                <option value="0.8">Insane</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Timer (seconds)</label>
              <input type="number" style={inputStyle} value={timerDuration} onChange={(e) => setTimerDuration(parseInt(e.target.value) || 120)} />
            </div>
          </div>

          <button
            style={btnStyle('#067a52')}
            onClick={() => createGame('tugofwar', { passage, pullSpeed, timerDuration })}
            disabled={!passage}
          >
            CREATE GAME
          </button>
        </div>
      )}
    </div>
  );
}

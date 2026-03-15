import { useState } from 'react';
import useGameAdmin, { inputStyle, labelStyle, btnStyle, sectionStyle, LiveStats } from './useGameAdmin';

export default function Level4Controls() {
  const { gameStatus, stats, createGame, startGame, endGame, isActive, isWaiting, isPlaying, lastEliminated } = useGameAdmin();

  const [bridgeSteps, setBridgeSteps] = useState(10);
  const [bridgeTimer, setBridgeTimer] = useState(180);

  const isThisGame = gameStatus?.gameType === 'glassbridge';
  const showConfig = !isActive || !isThisGame;
  const showControls = isActive && isThisGame;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-number)', color: '#4a90d9', letterSpacing: '3px', marginBottom: '8px' }}>
        LEVEL 4 — COMMAND CENTER
      </h1>
      <h2 style={{ fontFamily: 'var(--font-number)', color: '#888', fontSize: '14px', letterSpacing: '2px', marginBottom: '24px' }}>
        GLASS BRIDGE
      </h2>

      {showControls && (
        <LiveStats stats={stats} isWaiting={isWaiting} isActive={isActive} startGame={startGame} endGame={endGame} players={gameStatus?.players} lastEliminated={lastEliminated} />
      )}

      {showConfig && (
        <div style={sectionStyle}>
          <h3 style={{ color: '#4a90d9', fontFamily: 'var(--font-number)', marginBottom: '16px', letterSpacing: '1px' }}>CONFIGURE GAME</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Number of Steps</label>
              <input type="number" style={inputStyle} value={bridgeSteps} min={3} max={20} onChange={(e) => setBridgeSteps(parseInt(e.target.value) || 10)} />
            </div>
            <div>
              <label style={labelStyle}>Timer (s)</label>
              <input type="number" style={inputStyle} value={bridgeTimer} onChange={(e) => setBridgeTimer(parseInt(e.target.value) || 120)} />
            </div>
          </div>

          <button
            style={btnStyle('#4a90d9')}
            onClick={() => createGame('glassbridge', { steps: bridgeSteps, timerDuration: bridgeTimer })}
          >
            CREATE GAME
          </button>
        </div>
      )}
    </div>
  );
}

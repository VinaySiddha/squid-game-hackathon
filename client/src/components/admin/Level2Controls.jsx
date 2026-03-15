import { useState } from 'react';
import { apiFetch } from '../../api';
import useGameAdmin, { inputStyle, labelStyle, btnStyle, sectionStyle, LiveStats } from './useGameAdmin';

export default function Level2Controls() {
  const { gameStatus, stats, createGame, startGame, endGame, isActive, isWaiting, isPlaying, lastEliminated } = useGameAdmin();

  const [mingleTimer, setMingleTimer] = useState(300);
  const [mingleCallNumber, setMingleCallNumber] = useState(5);
  const [mingleRoundTime, setMingleRoundTime] = useState(10);

  const callMingleNumber = async () => {
    try {
      await apiFetch('/game/mingle-call', {
        method: 'POST',
        body: JSON.stringify({ number: mingleCallNumber, timeLimit: mingleRoundTime }),
      });
    } catch (err) { alert(err.message); }
  };

  const isThisGame = gameStatus?.gameType === 'mingle';
  const showConfig = !isActive || !isThisGame;
  const showControls = isActive && isThisGame;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-number)', color: '#d4a03c', letterSpacing: '3px', marginBottom: '8px' }}>
        LEVEL 2 — COMMAND CENTER
      </h1>
      <h2 style={{ fontFamily: 'var(--font-number)', color: '#888', fontSize: '14px', letterSpacing: '2px', marginBottom: '24px' }}>
        MINGLE GAME
      </h2>

      {showControls && (
        <>
          <LiveStats stats={stats} isWaiting={isWaiting} isActive={isActive} startGame={startGame} endGame={endGame} players={gameStatus?.players} lastEliminated={lastEliminated} />

          {isPlaying && (
            <div style={sectionStyle}>
              <h3 style={{ color: '#d4a03c', fontFamily: 'var(--font-number)', marginBottom: '12px', letterSpacing: '1px' }}>CALL A NUMBER</h3>
              <p style={{ color: '#888', fontSize: '12px', marginBottom: '16px' }}>
                Roll the dice or enter a specific number. Players must form groups of that size.
              </p>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Group Size</label>
                  <input
                    type="number" min={2} max={20} value={mingleCallNumber}
                    onChange={(e) => setMingleCallNumber(parseInt(e.target.value) || 2)}
                    style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.05)', border: '2px solid #d4a03c', borderRadius: '12px', color: '#d4a03c', fontSize: '48px', fontFamily: 'var(--font-number)', width: '120px', textAlign: 'center' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Time Limit (s)</label>
                  <input
                    type="number" min={5} max={30} value={mingleRoundTime}
                    onChange={(e) => setMingleRoundTime(parseInt(e.target.value) || 10)}
                    style={{ ...inputStyle, fontSize: '18px', padding: '12px', width: '80px', textAlign: 'center' }}
                  />
                </div>
                <button
                  style={{ ...btnStyle('#d4a03c'), padding: '16px 40px', fontSize: '20px', letterSpacing: '2px' }}
                  onClick={callMingleNumber}
                >
                  CALL "{mingleCallNumber}!"
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  style={{
                    padding: '20px 40px', fontSize: '20px', letterSpacing: '3px',
                    fontFamily: 'var(--font-number)',
                    background: 'linear-gradient(135deg, #E91E7B, #b8155f)',
                    color: '#fff', border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px', cursor: 'pointer',
                    boxShadow: '0 0 30px rgba(233,30,123,0.3)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseOver={(e) => { e.target.style.transform = 'scale(1.05)'; e.target.style.boxShadow = '0 0 50px rgba(233,30,123,0.5)'; }}
                  onMouseOut={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 0 30px rgba(233,30,123,0.3)'; }}
                  onClick={() => {
                    const random = Math.floor(Math.random() * 9) + 2; // 2-10
                    setMingleCallNumber(random);
                    // Call with the random number
                    apiFetch('/game/mingle-call', {
                      method: 'POST',
                      body: JSON.stringify({ number: random, timeLimit: mingleRoundTime }),
                    }).catch(err => alert(err.message));
                  }}
                >
                  🎲 ROLL DICE
                </button>
                <span style={{ color: '#888', fontSize: '12px' }}>Random number 2-10</span>
              </div>
            </div>
          )}
        </>
      )}

      {showConfig && (
        <div style={sectionStyle}>
          <h3 style={{ color: '#d4a03c', fontFamily: 'var(--font-number)', marginBottom: '16px', letterSpacing: '1px' }}>CONFIGURE GAME</h3>
          <p style={{ color: '#888', fontSize: '12px', marginBottom: '16px' }}>
            Create the game, start it, then call numbers each round. The dunggeulge song plays while players wait.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Game Timer (s)</label>
              <input type="number" style={inputStyle} value={mingleTimer} onChange={(e) => setMingleTimer(parseInt(e.target.value) || 300)} />
            </div>
            <div>
              <label style={labelStyle}>Default Round Time (s)</label>
              <input type="number" style={inputStyle} value={mingleRoundTime} min={5} max={30} onChange={(e) => setMingleRoundTime(parseInt(e.target.value) || 10)} />
            </div>
          </div>

          <button
            style={btnStyle('#d4a03c')}
            onClick={() => createGame('mingle', { timerDuration: mingleTimer })}
          >
            CREATE GAME
          </button>
        </div>
      )}
    </div>
  );
}

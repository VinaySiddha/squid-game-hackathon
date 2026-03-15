import { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import socket from '../../socket';

export default function GameControls() {
  const [tab, setTab] = useState('rlgl');
  const [gameStatus, setGameStatus] = useState(null);
  const [presets, setPresets] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState({ total: 0, alive: 0, eliminated: 0, finished: 0 });

  // RLGL config
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

  // Mingle config
  const [mingleTimer, setMingleTimer] = useState(300);
  const [mingleCallNumber, setMingleCallNumber] = useState(5);
  const [mingleRoundTime, setMingleRoundTime] = useState(10);

  // Tug of War config
  const [towMatchups, setTowMatchups] = useState([{ team1Id: '', team1Name: '', team2Id: '', team2Name: '' }]);
  const [towTimer, setTowTimer] = useState(60);

  // Glass Bridge config
  const [bridgeSteps, setBridgeSteps] = useState(10);
  const [bridgeTimer, setBridgeTimer] = useState(180);

  useEffect(() => {
    fetchStatus();
    fetchPresets();
    fetchTeams();

    socket.connect();
    socket.on('game:stats-update', () => fetchStatus());
    socket.on('game:player-eliminated', () => fetchStatus());
    socket.on('game:player-finished', () => fetchStatus());
    socket.on('game:end', () => fetchStatus());
    socket.on('game:signal', ({ signal }) => setCurrentSignal(signal));

    return () => {
      socket.off('game:stats-update');
      socket.off('game:player-eliminated');
      socket.off('game:player-finished');
      socket.off('game:end');
      socket.off('game:signal');
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await apiFetch('/game/status');
      setGameStatus(data);
      if (data.stats) setStats(data.stats);
      if (data.currentSignal) setCurrentSignal(data.currentSignal);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPresets = async () => {
    try {
      const data = await apiFetch('/game/presets');
      setPresets(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTeams = async () => {
    try {
      const data = await apiFetch('/teams');
      setTeams(data);
    } catch (err) {
      console.error(err);
    }
  };

  const createGame = async (gameType, config) => {
    try {
      await apiFetch('/game/create', {
        method: 'POST',
        body: JSON.stringify({ gameType, config }),
      });
      fetchStatus();
    } catch (err) {
      alert(err.message);
    }
  };

  const startGame = async () => {
    try {
      await apiFetch('/game/start', { method: 'POST' });
      fetchStatus();
    } catch (err) {
      alert(err.message);
    }
  };

  const endGame = async () => {
    try {
      await apiFetch('/game/end', { method: 'POST' });
      fetchStatus();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleSignal = async () => {
    const next = currentSignal === 'green' ? 'red' : 'green';
    try {
      await apiFetch('/game/signal', {
        method: 'POST',
        body: JSON.stringify({ signal: next }),
      });
      setCurrentSignal(next);
    } catch (err) {
      alert(err.message);
    }
  };

  const startTowMatchup = async (idx) => {
    try {
      await apiFetch('/game/tow-start-matchup', {
        method: 'POST',
        body: JSON.stringify({ matchupIndex: idx }),
      });
    } catch (err) {
      alert(err.message);
    }
  };

  const callMingleNumber = async () => {
    try {
      await apiFetch('/game/mingle-call', {
        method: 'POST',
        body: JSON.stringify({ number: mingleCallNumber, timeLimit: mingleRoundTime }),
      });
    } catch (err) {
      alert(err.message);
    }
  };

  const isActive = gameStatus?.active && gameStatus?.status !== 'finished';
  const isWaiting = gameStatus?.active && gameStatus?.status === 'waiting';
  const isPlaying = gameStatus?.active && gameStatus?.status === 'active';

  const inputStyle = {
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    width: '100%',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    marginBottom: '4px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  };

  const btnStyle = (color = '#E91E7B') => ({
    padding: '10px 20px',
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'var(--font-number)',
    fontSize: '14px',
    letterSpacing: '1px',
  });

  const sectionStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '16px',
  };

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-number)', color: 'var(--sg-pink)', marginBottom: '20px', letterSpacing: '2px' }}>
        GAME CONTROLS
      </h2>

      {/* Live Stats */}
      {isActive && (
        <div style={{ ...sectionStyle, display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div><span style={{ color: '#888', fontSize: '12px' }}>TOTAL</span><br /><strong style={{ fontSize: '24px' }}>{stats.total}</strong></div>
          <div><span style={{ color: '#888', fontSize: '12px' }}>ALIVE</span><br /><strong style={{ fontSize: '24px', color: '#00ff66' }}>{stats.alive}</strong></div>
          <div><span style={{ color: '#888', fontSize: '12px' }}>ELIMINATED</span><br /><strong style={{ fontSize: '24px', color: '#ff0040' }}>{stats.eliminated}</strong></div>
          <div><span style={{ color: '#888', fontSize: '12px' }}>FINISHED</span><br /><strong style={{ fontSize: '24px', color: '#c9a84c' }}>{stats.finished}</strong></div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            {isWaiting && <button style={btnStyle('#067a52')} onClick={startGame}>START GAME</button>}
            {isActive && <button style={btnStyle('#ff0040')} onClick={endGame}>END GAME</button>}
          </div>
        </div>
      )}

      {/* Signal Control (RLGL active + manual mode) */}
      {isPlaying && gameStatus?.gameType === 'rlgl' && gameStatus?.config?.signalMode === 'manual' && (
        <div style={{ ...sectionStyle, textAlign: 'center' }}>
          <p style={{ color: '#888', marginBottom: '12px', fontSize: '12px', letterSpacing: '1px' }}>SIGNAL CONTROL</p>
          <button
            onClick={toggleSignal}
            style={{
              width: '120px', height: '120px', borderRadius: '50%',
              border: '4px solid rgba(255,255,255,0.2)',
              background: currentSignal === 'green'
                ? 'radial-gradient(circle, #00ff66, #006622)'
                : 'radial-gradient(circle, #ff0040, #660019)',
              color: '#fff', fontSize: '16px', fontFamily: 'var(--font-number)',
              cursor: 'pointer', letterSpacing: '2px',
              boxShadow: currentSignal === 'green'
                ? '0 0 40px rgba(0,255,102,0.4)'
                : '0 0 40px rgba(255,0,64,0.4)',
            }}
          >
            {currentSignal === 'green' ? 'GREEN' : 'RED'}
          </button>
          <p style={{ color: '#888', marginTop: '8px', fontSize: '11px' }}>Click to toggle</p>
        </div>
      )}

      {/* Tabs */}
      {!isActive && (
        <>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
            {[
              { key: 'rlgl', label: 'Red Light Green Light', color: '#E91E7B' },
              { key: 'mingle', label: 'Mingle Game', color: '#d4a03c' },
              { key: 'tugofwar', label: 'Tug of War', color: '#067a52' },
              { key: 'glassbridge', label: 'Glass Bridge', color: '#4a90d9' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '8px 16px',
                  background: tab === t.key ? t.color : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'var(--font-number)',
                  letterSpacing: '1px',
                  opacity: tab === t.key ? 1 : 0.5,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* RLGL Config */}
          {tab === 'rlgl' && (
            <div style={sectionStyle}>
              <h3 style={{ color: '#E91E7B', fontFamily: 'var(--font-number)', marginBottom: '16px', letterSpacing: '1px' }}>RED LIGHT GREEN LIGHT</h3>

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

          {/* Mingle Config */}
          {tab === 'mingle' && (
            <div style={sectionStyle}>
              <h3 style={{ color: '#d4a03c', fontFamily: 'var(--font-number)', marginBottom: '16px', letterSpacing: '1px' }}>MINGLE GAME</h3>
              <p style={{ color: '#888', fontSize: '12px', marginBottom: '16px' }}>
                Create the game, start it, then call numbers each round. Players must form groups of that number. Anyone left out is eliminated.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Game Timer (s)</label>
                  <input type="number" style={inputStyle} value={mingleTimer} onChange={(e) => setMingleTimer(parseInt(e.target.value) || 300)} />
                </div>
                <div>
                  <label style={labelStyle}>Time per Round (s)</label>
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

          {/* Tug of War Config */}
          {tab === 'tugofwar' && (
            <div style={sectionStyle}>
              <h3 style={{ color: '#067a52', fontFamily: 'var(--font-number)', marginBottom: '16px', letterSpacing: '1px' }}>TUG OF WAR</h3>

              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Matchups</label>
                {towMatchups.map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <select
                      style={{ ...inputStyle, flex: 1 }}
                      value={m.team1Id}
                      onChange={(e) => {
                        const team = teams.find(t => t.id === parseInt(e.target.value));
                        const updated = [...towMatchups];
                        updated[idx] = { ...m, team1Id: e.target.value, team1Name: team?.team_name || '' };
                        setTowMatchups(updated);
                      }}
                    >
                      <option value="">-- Team 1 --</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                    </select>
                    <span style={{ color: 'var(--sg-gold)', fontFamily: 'var(--font-number)' }}>VS</span>
                    <select
                      style={{ ...inputStyle, flex: 1 }}
                      value={m.team2Id}
                      onChange={(e) => {
                        const team = teams.find(t => t.id === parseInt(e.target.value));
                        const updated = [...towMatchups];
                        updated[idx] = { ...m, team2Id: e.target.value, team2Name: team?.team_name || '' };
                        setTowMatchups(updated);
                      }}
                    >
                      <option value="">-- Team 2 --</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                    </select>
                    {towMatchups.length > 1 && (
                      <button style={{ ...btnStyle('#ff0040'), padding: '8px 12px' }} onClick={() => setTowMatchups(prev => prev.filter((_, i) => i !== idx))}>X</button>
                    )}
                  </div>
                ))}
                <button
                  style={{ ...btnStyle('rgba(255,255,255,0.1)'), fontSize: '12px' }}
                  onClick={() => setTowMatchups(prev => [...prev, { team1Id: '', team1Name: '', team2Id: '', team2Name: '' }])}
                >
                  + Add Matchup
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Timer (s)</label>
                <input type="number" style={{ ...inputStyle, width: '100px' }} value={towTimer} onChange={(e) => setTowTimer(parseInt(e.target.value) || 60)} />
              </div>

              <button
                style={btnStyle('#067a52')}
                onClick={() => createGame('tugofwar', {
                  matchups: towMatchups, timerDuration: towTimer,
                })}
              >
                CREATE GAME
              </button>
            </div>
          )}

          {/* Glass Bridge Config */}
          {tab === 'glassbridge' && (
            <div style={sectionStyle}>
              <h3 style={{ color: '#4a90d9', fontFamily: 'var(--font-number)', marginBottom: '16px', letterSpacing: '1px' }}>GLASS BRIDGE</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Steps</label>
                  <input type="number" style={inputStyle} value={bridgeSteps} min={3} max={20} onChange={(e) => setBridgeSteps(parseInt(e.target.value) || 10)} />
                </div>
                <div>
                  <label style={labelStyle}>Timer (s)</label>
                  <input type="number" style={inputStyle} value={bridgeTimer} onChange={(e) => setBridgeTimer(parseInt(e.target.value) || 120)} />
                </div>
              </div>

              <button
                style={btnStyle('#4a90d9')}
                onClick={() => createGame('glassbridge', {
                  steps: bridgeSteps, timerDuration: bridgeTimer,
                })}
              >
                CREATE GAME
              </button>
            </div>
          )}
        </>
      )}

      {/* Mingle Round Controls (when game active) */}
      {isPlaying && gameStatus?.gameType === 'mingle' && (
        <div style={sectionStyle}>
          <h3 style={{ color: '#d4a03c', fontFamily: 'var(--font-number)', marginBottom: '12px' }}>CALL A NUMBER</h3>
          <p style={{ color: '#888', fontSize: '12px', marginBottom: '12px' }}>
            Players must form groups of this number. Anyone left out is eliminated.
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px', letterSpacing: '1px', textTransform: 'uppercase' }}>Group Size</label>
              <input
                type="number" min={2} max={20} value={mingleCallNumber}
                onChange={(e) => setMingleCallNumber(parseInt(e.target.value) || 2)}
                style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '32px', fontFamily: 'var(--font-number)', width: '100px', textAlign: 'center' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px', letterSpacing: '1px', textTransform: 'uppercase' }}>Time (s)</label>
              <input
                type="number" min={5} max={30} value={mingleRoundTime}
                onChange={(e) => setMingleRoundTime(parseInt(e.target.value) || 10)}
                style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '18px', fontFamily: 'var(--font-number)', width: '80px', textAlign: 'center' }}
              />
            </div>
            <button
              style={{ ...btnStyle('#d4a03c'), padding: '14px 32px', fontSize: '18px' }}
              onClick={callMingleNumber}
            >
              CALL "{mingleCallNumber}!"
            </button>
          </div>
        </div>
      )}

      {/* Tug of War Matchup Controls (when game active) */}
      {isPlaying && gameStatus?.gameType === 'tugofwar' && (
        <div style={sectionStyle}>
          <h3 style={{ color: '#067a52', fontFamily: 'var(--font-number)', marginBottom: '12px' }}>MATCHUP CONTROLS</h3>
          {(gameStatus?.config?.matchups || []).map((m, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#fff', flex: 1 }}>{m.team1Name} vs {m.team2Name}</span>
              <button style={btnStyle('#067a52')} onClick={() => startTowMatchup(idx)}>START</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

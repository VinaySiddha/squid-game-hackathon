import { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import Timer from '../Timer';

export default function TimerControls() {
  const [timerState, setTimerState] = useState({ timer_end_time: null, timer_running: false, timer_paused_remaining: null });
  const [hours, setHours] = useState('24');
  const [minutes, setMinutes] = useState('0');

  const fetchTimer = async () => {
    try {
      const data = await apiFetch('/timer');
      setTimerState(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchTimer(); }, []);

  const setDuration = async () => {
    const ms = (parseInt(hours) * 3600 + parseInt(minutes) * 60) * 1000;
    try {
      const data = await apiFetch('/timer/set', { method: 'POST', body: JSON.stringify({ duration_ms: ms }) });
      setTimerState(data);
    } catch (err) {
      console.error(err);
    }
  };

  const action = async (endpoint) => {
    try {
      const data = await apiFetch(`/timer/${endpoint}`, { method: 'POST' });
      setTimerState(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1>TIMER</h1>
      <div style={{
        background: '#1a1a2e', border: '1px solid #333', borderRadius: 12,
        padding: 24, textAlign: 'center', marginBottom: 20,
      }}>
        <div style={{ fontSize: 48, color: 'var(--sg-pink)' }}>
          <Timer endTime={timerState.timer_end_time} isRunning={timerState.timer_running} />
        </div>
        <div style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
          {timerState.timer_running ? 'RUNNING' : 'PAUSED'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div>
          <label style={{ color: '#888', fontSize: 11, display: 'block' }}>HOURS</label>
          <input type="number" value={hours} onChange={(e) => setHours(e.target.value)} min="0" max="99" style={{
            width: 80, padding: 10, background: '#0f0f1a', border: '1px solid #333',
            borderRadius: 8, color: '#fff', fontSize: 18, fontFamily: 'var(--font-number)',
          }} />
        </div>
        <div>
          <label style={{ color: '#888', fontSize: 11, display: 'block' }}>MINUTES</label>
          <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} min="0" max="59" style={{
            width: 80, padding: 10, background: '#0f0f1a', border: '1px solid #333',
            borderRadius: 8, color: '#fff', fontSize: 18, fontFamily: 'var(--font-number)',
          }} />
        </div>
        <button onClick={setDuration} style={{
          padding: '10px 16px', background: '#333', color: '#fff', border: 'none',
          borderRadius: 8, cursor: 'pointer', alignSelf: 'flex-end',
        }}>
          SET
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => action('start')} style={{
          flex: 1, padding: 12, background: 'var(--sg-green)', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, letterSpacing: 2,
        }}>
          START
        </button>
        <button onClick={() => action('pause')} style={{
          flex: 1, padding: 12, background: 'var(--sg-gold)', color: '#000',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, letterSpacing: 2,
        }}>
          PAUSE
        </button>
        <button onClick={() => action('reset')} style={{
          flex: 1, padding: 12, background: 'var(--sg-red)', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, letterSpacing: 2,
        }}>
          RESET
        </button>
      </div>
    </div>
  );
}

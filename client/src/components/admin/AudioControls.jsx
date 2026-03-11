import { useState, useEffect } from 'react';
import socket from '../../socket';

export default function AudioControls() {
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.3);

  useEffect(() => {
    socket.connect();
    return () => {};
  }, []);

  const send = (action, value) => {
    socket.emit('audio:control', { action, value });
  };

  return (
    <div>
      <h1>AUDIO</h1>
      <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button onClick={() => send('play')} style={{
            padding: '10px 24px', background: 'var(--sg-green)', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', letterSpacing: 2,
          }}>
            PLAY
          </button>
          <button onClick={() => send('pause')} style={{
            padding: '10px 24px', background: 'var(--sg-gold)', color: '#000',
            border: 'none', borderRadius: 8, cursor: 'pointer', letterSpacing: 2,
          }}>
            PAUSE
          </button>
          <button onClick={() => { setMuted(!muted); send(muted ? 'unmute' : 'mute'); }} style={{
            padding: '10px 24px', background: muted ? 'var(--sg-red)' : '#333', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', letterSpacing: 2,
          }}>
            {muted ? 'UNMUTE' : 'MUTE'}
          </button>
        </div>

        <div>
          <label style={{ color: '#888', fontSize: 11, letterSpacing: 2, display: 'block', marginBottom: 8 }}>
            VOLUME: {Math.round(volume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              send('volume', v);
            }}
            style={{ width: '100%', accentColor: 'var(--sg-pink)' }}
          />
        </div>
      </div>
    </div>
  );
}

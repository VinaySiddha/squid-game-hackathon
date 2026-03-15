import { useState, useEffect, useRef } from 'react';
import socket from '../../socket';

const AUDIO_BASE = '/uploads/SquidGameAudios';

const TRACKS = [
  { id: `${AUDIO_BASE}/core/Main background music  .mp3`, label: 'Main BGM', icon: '🎵' },
  { id: `${AUDIO_BASE}/sfx/Doll Earrape Green light Red light.mp3`, label: 'Red Light Green Light (Doll)', icon: '🔴' },
  { id: `${AUDIO_BASE}/music tracks/Pink Soldiers.mp3`, label: 'Pink Soldiers', icon: '🎭' },
  { id: `${AUDIO_BASE}/music tracks/Elimination theme music.mp3`, label: 'Elimination Theme', icon: '💀' },
  { id: `${AUDIO_BASE}/sfx/mingle-game-song(dunggeulge dunggeulge).mp3.mpeg`, label: 'Mingle Game Song', icon: '⚔️' },
  { id: `${AUDIO_BASE}/music tracks/Victory celebration music.mp3`, label: 'Victory Theme', icon: '🏆' },
];

const SFX_BUTTONS = [
  { id: `${AUDIO_BASE}/core/Elimination sound effect .MP3`, label: 'Eliminate', icon: '💥', color: '#ff0040' },
  { id: `${AUDIO_BASE}/core/Check-in success sound.mp3`, label: 'Check-in', icon: '✅', color: '#0B6E4F' },
  { id: `${AUDIO_BASE}/sfx/alarm clock.mp3`, label: "Time's Up", icon: '⏰', color: '#c9a84c' },
  { id: `${AUDIO_BASE}/sfx/gunshot.mp3`, label: 'Gunshot', icon: '🔫', color: '#ff4444' },
  { id: `${AUDIO_BASE}/sfx/Alarm  siren.mp3`, label: 'Alarm Siren', icon: '🚨', color: '#E91E7B' },
  { id: `${AUDIO_BASE}/sfx/Whistle blow.mp3`, label: 'Whistle', icon: '📢', color: '#4488ff' },
  { id: `${AUDIO_BASE}/sfx/Drum roll.mp3`, label: 'Drum Roll', icon: '🥁', color: '#ff8800' },
  { id: `${AUDIO_BASE}/sfx/Green Light.mp3`, label: 'Green Light', icon: '🟢', color: '#00cc66' },
  { id: `${AUDIO_BASE}/sfx/Red Light.mp3`, label: 'Red Light', icon: '🔴', color: '#ff0040' },
];

export default function AudioControls() {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(30);
  const [activeTrack, setActiveTrack] = useState(TRACKS[0].id);
  const [lastSfx, setLastSfx] = useState(null);
  const localAudioRef = useRef(null);

  useEffect(() => {
    socket.connect();
    localAudioRef.current = new Audio();
    localAudioRef.current.loop = true;
    localAudioRef.current.volume = 0.3;
    return () => {
      if (localAudioRef.current) {
        localAudioRef.current.pause();
        localAudioRef.current = null;
      }
    };
  }, []);

  const send = (action, value) => {
    socket.emit('audio:control', { action, value });
  };

  const handlePlay = () => {
    send('play');
    if (localAudioRef.current) {
      if (!localAudioRef.current.src || localAudioRef.current.src === window.location.href) {
        localAudioRef.current.src = activeTrack;
      }
      localAudioRef.current.play().catch(() => {});
    }
    setPlaying(true);
  };

  const handlePause = () => {
    send('pause');
    if (localAudioRef.current) localAudioRef.current.pause();
    setPlaying(false);
  };

  const handleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    send(newMuted ? 'mute' : 'unmute');
    if (localAudioRef.current) localAudioRef.current.muted = newMuted;
  };

  const handleTrackChange = (trackId) => {
    setActiveTrack(trackId);
    send('track', trackId);
    if (localAudioRef.current) {
      localAudioRef.current.src = trackId;
      localAudioRef.current.play().catch(() => {});
    }
    setPlaying(true);
  };

  const handleSfx = (sfxId) => {
    send('sfx', sfxId);
    // Also play locally so admin hears it
    const audio = new Audio(sfxId);
    audio.play().catch(() => {});
    setLastSfx(sfxId);
    setTimeout(() => setLastSfx(null), 500);
  };

  const handleVolume = (e) => {
    const v = parseInt(e.target.value);
    setVolume(v);
    send('volume', v / 100);
    if (localAudioRef.current) localAudioRef.current.volume = v / 100;
  };

  return (
    <div>
      <h1>AUDIO COMMAND CENTER</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
        Control background music and sound effects on the projector wall in real-time.
      </p>

      {/* ─── Music Transport ─── */}
      <div style={{
        background: '#1a1a2e', border: '1px solid #333', borderRadius: 12,
        padding: 24, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ color: playing ? '#00ff88' : '#ff0040', fontSize: 10 }}>●</span>
          <span style={{ color: '#888', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
            {playing ? 'NOW PLAYING' : 'PAUSED'}
          </span>
          {activeTrack && (
            <span style={{ color: '#E91E7B', fontSize: 12, marginLeft: 8 }}>
              {TRACKS.find(t => t.id === activeTrack)?.label || activeTrack}
            </span>
          )}
        </div>

        {/* Transport buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={handlePlay} style={{
            padding: '12px 28px', background: playing ? '#0B6E4F' : '#067a52',
            color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
            fontSize: 14, letterSpacing: 2, fontWeight: 'bold',
            boxShadow: playing ? '0 0 20px rgba(0,255,136,0.2)' : 'none',
          }}>
            ▶ PLAY
          </button>
          <button onClick={handlePause} style={{
            padding: '12px 28px', background: '#c9a84c',
            color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer',
            fontSize: 14, letterSpacing: 2, fontWeight: 'bold',
          }}>
            ⏸ PAUSE
          </button>
          <button onClick={() => { send('pause'); setPlaying(false); send('track', activeTrack); }} style={{
            padding: '12px 28px', background: '#333',
            color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
            fontSize: 14, letterSpacing: 2,
          }}>
            ⏹ STOP
          </button>
          <button onClick={handleMute} style={{
            padding: '12px 28px',
            background: muted ? 'var(--sg-red)' : '#333',
            color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
            fontSize: 14, letterSpacing: 2,
          }}>
            {muted ? '🔇 MUTED' : '🔊 MUTE'}
          </button>
        </div>

        {/* Volume */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ color: '#888', fontSize: 11, letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            VOLUME
            <span style={{
              background: '#E91E7B', color: '#fff', padding: '2px 8px',
              borderRadius: 4, fontSize: 12, fontFamily: 'var(--font-number)',
            }}>{volume}%</span>
          </label>
          <input
            type="range" min="0" max="100" step="5" value={volume}
            onChange={handleVolume}
            style={{ width: '100%', accentColor: 'var(--sg-pink)', height: 6 }}
          />
        </div>
      </div>

      {/* ─── Track Selection ─── */}
      <div style={{
        background: '#1a1a2e', border: '1px solid #333', borderRadius: 12,
        padding: 24, marginBottom: 20,
      }}>
        <h3 style={{ color: '#E91E7B', fontSize: 13, letterSpacing: 3, marginBottom: 16, fontFamily: 'var(--font-number)' }}>
          MUSIC TRACKS
        </h3>
        <p style={{ color: '#555', fontSize: 11, marginBottom: 12 }}>
          Audio files loaded from <code style={{ color: '#888' }}>uploads/SquidGameAudios/</code>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {TRACKS.map(track => (
            <button
              key={track.id}
              onClick={() => handleTrackChange(track.id)}
              style={{
                padding: '14px 12px', textAlign: 'left',
                background: activeTrack === track.id ? 'rgba(233,30,123,0.15)' : '#0f0f1a',
                border: activeTrack === track.id ? '1px solid var(--sg-pink)' : '1px solid #222',
                borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 20 }}>{track.icon}</span>
              <span>{track.label}</span>
              {activeTrack === track.id && playing && (
                <span style={{ marginLeft: 'auto', color: '#00ff88', fontSize: 10 }}>●</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── SFX Soundboard ─── */}
      <div style={{
        background: '#1a1a2e', border: '1px solid #333', borderRadius: 12,
        padding: 24,
      }}>
        <h3 style={{ color: '#E91E7B', fontSize: 13, letterSpacing: 3, marginBottom: 16, fontFamily: 'var(--font-number)' }}>
          SFX SOUNDBOARD
        </h3>
        <p style={{ color: '#555', fontSize: 11, marginBottom: 16 }}>
          Instant sound effects played on the wall. Add files like <code style={{ color: '#888' }}>gunshot.mp3</code>, <code style={{ color: '#888' }}>alarm.mp3</code>, etc.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          {SFX_BUTTONS.map(sfx => (
            <button
              key={sfx.id}
              onClick={() => handleSfx(sfx.id)}
              style={{
                padding: '16px 8px', textAlign: 'center',
                background: lastSfx === sfx.id ? sfx.color : '#0f0f1a',
                border: `1px solid ${sfx.color}44`,
                borderRadius: 10, cursor: 'pointer',
                color: lastSfx === sfx.id ? '#fff' : sfx.color,
                fontSize: 12, fontWeight: 'bold', letterSpacing: 1,
                transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 28 }}>{sfx.icon}</span>
              <span>{sfx.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
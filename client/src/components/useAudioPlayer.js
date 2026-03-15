import { useRef, useEffect, useCallback } from 'react';

const AUDIO_BASE = '/uploads/SquidGameAudios';

export default function useAudioPlayer({ socket, autoPlay = false }) {
  const bgMusicRef = useRef(null);
  const sfxRef = useRef({});

  useEffect(() => {
    bgMusicRef.current = new Audio(`${AUDIO_BASE}/core/Main background music  .mp3`);
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.3;

    // Pre-load known SFX from SquidGameAudios
    const sfxMap = {
      eliminate: `${AUDIO_BASE}/core/Elimination sound effect .MP3`,
      checkin: `${AUDIO_BASE}/core/Check-in success sound.mp3`,
      timesup: `${AUDIO_BASE}/sfx/alarm clock.mp3`,
      gunshot: `${AUDIO_BASE}/sfx/gunshot.mp3`,
      alarm: `${AUDIO_BASE}/sfx/Alarm  siren.mp3`,
      whistle: `${AUDIO_BASE}/sfx/Whistle blow.mp3`,
      drumroll: `${AUDIO_BASE}/sfx/Drum roll.mp3`,
      greenlight: `${AUDIO_BASE}/sfx/Green Light.mp3`,
      redlight: `${AUDIO_BASE}/sfx/Red Light.mp3`,
    };
    for (const [name, path] of Object.entries(sfxMap)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      sfxRef.current[name] = audio;
    }

    if (autoPlay && bgMusicRef.current) {
      bgMusicRef.current.play().catch(() => {});
    }

    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, [autoPlay]);

  useEffect(() => {
    if (!socket) return;

    const handleAudio = (data) => {
      const bg = bgMusicRef.current;
      if (!bg) return;

      switch (data.action) {
        case 'play': bg.play().catch(() => {}); break;
        case 'pause': bg.pause(); break;
        case 'mute': bg.muted = true; break;
        case 'unmute': bg.muted = false; break;
        case 'volume': bg.volume = Math.max(0, Math.min(1, data.value)); break;
        case 'track':
          // Support both full paths and simple filenames
          bg.src = data.value.startsWith('/') ? data.value : `/audio/${data.value}`;
          bg.play().catch(() => {});
          break;
        case 'sfx': {
          const sfxId = data.value;
          let audio = sfxRef.current[sfxId];
          if (!audio) {
            // Support full paths or simple names
            const src = sfxId.startsWith('/') ? sfxId : `/audio/${sfxId}.mp3`;
            audio = new Audio(src);
            sfxRef.current[sfxId] = audio;
          }
          audio.currentTime = 0;
          audio.play().catch(() => {});
          break;
        }
        case 'player-announce': {
          // Play player elimination announcement (player_001.mp3 - player_300.mp3)
          const playerNum = String(data.value).padStart(3, '0');
          const src = `${AUDIO_BASE}/players(0-300 audios)/player_${playerNum}.mp3`;
          const audio = new Audio(src);
          audio.play().catch(() => {});
          break;
        }
      }
    };

    socket.on('audio:update', handleAudio);
    return () => socket.off('audio:update', handleAudio);
  }, [socket]);

  const playSFX = useCallback((name) => {
    let audio = sfxRef.current[name];
    if (!audio) {
      const src = name.startsWith('/') ? name : `/audio/${name}.mp3`;
      audio = new Audio(src);
      sfxRef.current[name] = audio;
    }
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  // Play player elimination announcement
  const playPlayerAnnouncement = useCallback((playerNumber) => {
    const num = String(playerNumber).padStart(3, '0');
    const src = `${AUDIO_BASE}/players(0-300 audios)/player_${num}.mp3`;
    const audio = new Audio(src);
    audio.play().catch(() => {});
  }, []);

  return { playSFX, playPlayerAnnouncement, bgMusicRef };
}

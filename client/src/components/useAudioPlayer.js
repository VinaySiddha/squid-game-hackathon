import { useRef, useEffect, useCallback } from 'react';

export default function useAudioPlayer({ socket, autoPlay = false }) {
  const bgMusicRef = useRef(null);
  const sfxRef = useRef(null);

  useEffect(() => {
    bgMusicRef.current = new Audio('/audio/bg-music.mp3');
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.3;

    sfxRef.current = {
      eliminate: new Audio('/audio/eliminate.mp3'),
      checkin: new Audio('/audio/checkin.mp3'),
      timesup: new Audio('/audio/timesup.mp3'),
    };

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
          bg.src = `/audio/${data.value}`;
          bg.play().catch(() => {});
          break;
      }
    };

    socket.on('audio:update', handleAudio);
    return () => socket.off('audio:update', handleAudio);
  }, [socket]);

  const playSFX = useCallback((name) => {
    const audio = sfxRef.current?.[name];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }, []);

  return { playSFX, bgMusicRef };
}

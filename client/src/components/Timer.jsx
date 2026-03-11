import { useState, useEffect } from 'react';

export default function Timer({ endTime, isRunning, onExpire }) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!endTime || !isRunning) {
      return;
    }

    const tick = () => {
      const ms = new Date(endTime).getTime() - Date.now();
      if (ms <= 0) {
        setRemaining(0);
        if (onExpire) onExpire();
        return;
      }
      setRemaining(ms);
    };

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [endTime, isRunning, onExpire]);

  if (remaining === null && !isRunning) {
    return <span className="timer">--:--:--</span>;
  }

  const totalSec = Math.max(0, Math.floor((remaining || 0) / 1000));
  const hours = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSec % 60).padStart(2, '0');

  const isExpired = remaining !== null && remaining <= 0;

  return (
    <span className={`timer ${isExpired ? 'timer-expired' : ''}`}
          style={{ fontFamily: 'var(--font-number)', fontSize: 'inherit', color: isExpired ? 'var(--sg-red)' : 'inherit' }}>
      {isExpired ? "TIME'S UP" : `${hours}:${minutes}:${seconds}`}
    </span>
  );
}

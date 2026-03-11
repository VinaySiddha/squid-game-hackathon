import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../auth.js';
import { getIO } from '../socket.js';

const router = Router();

async function getSetting(key) {
  const [rows] = await pool.query('SELECT value FROM settings WHERE `key` = ?', [key]);
  return rows.length > 0 ? rows[0].value : null;
}

async function setSetting(key, value) {
  await pool.query(
    'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
    [key, value, value]
  );
}

async function getTimerState() {
  return {
    timer_end_time: await getSetting('timer_end_time'),
    timer_running: (await getSetting('timer_running')) === 'true',
    timer_paused_remaining: await getSetting('timer_paused_remaining'),
  };
}

router.get('/timer', async (req, res) => {
  try {
    const state = await getTimerState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/timer/set', authMiddleware, async (req, res) => {
  const { end_time, duration_ms } = req.body;
  try {
    if (end_time) {
      await setSetting('timer_end_time', end_time);
      await setSetting('timer_paused_remaining', String(new Date(end_time).getTime() - Date.now()));
    } else if (duration_ms) {
      const endTime = new Date(Date.now() + parseInt(duration_ms)).toISOString();
      await setSetting('timer_end_time', endTime);
      await setSetting('timer_paused_remaining', String(duration_ms));
    }
    await setSetting('timer_running', 'false');
    const state = await getTimerState();
    getIO().emit('timer:update', state);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/timer/start', authMiddleware, async (req, res) => {
  try {
    const pausedRemaining = await getSetting('timer_paused_remaining');
    if (pausedRemaining) {
      const endTime = new Date(Date.now() + parseInt(pausedRemaining)).toISOString();
      await setSetting('timer_end_time', endTime);
    }
    await setSetting('timer_running', 'true');
    const state = await getTimerState();
    getIO().emit('timer:update', state);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/timer/pause', authMiddleware, async (req, res) => {
  try {
    const endTime = await getSetting('timer_end_time');
    if (endTime) {
      const remaining = Math.max(0, new Date(endTime).getTime() - Date.now());
      await setSetting('timer_paused_remaining', String(remaining));
    }
    await setSetting('timer_running', 'false');
    const state = await getTimerState();
    getIO().emit('timer:update', state);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/timer/reset', authMiddleware, async (req, res) => {
  try {
    await setSetting('timer_end_time', null);
    await setSetting('timer_running', 'false');
    await setSetting('timer_paused_remaining', null);
    const state = await getTimerState();
    getIO().emit('timer:update', state);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

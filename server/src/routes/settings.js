import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../auth.js';

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

// GET /api/settings/total-participants
router.get('/settings/total-participants', async (req, res) => {
  try {
    const val = await getSetting('total_participants');
    res.json({ total_participants: val ? parseInt(val) : 300 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/total-participants
router.post('/settings/total-participants', authMiddleware, async (req, res) => {
  const { total_participants } = req.body;
  if (!total_participants || total_participants < 1 || total_participants > 999) {
    return res.status(400).json({ error: 'total_participants must be between 1 and 999' });
  }
  try {
    await setSetting('total_participants', String(total_participants));
    res.json({ total_participants: parseInt(total_participants) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

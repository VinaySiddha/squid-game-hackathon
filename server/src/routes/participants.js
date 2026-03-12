import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db.js';
import { authMiddleware } from '../auth.js';
import { getIO } from '../socket.js';

const router = Router();

// GET /api/participants — list all (no auth, wall needs this)
router.get('/participants', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, player_number, name, email, photo_url, is_alive, is_checked_in FROM participants ORDER BY player_number ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/participants/bulk — create many participants (admin)
// Body: { participants: [{player_number, name, email}], isLeader: true/false }
// isLeader=true → generates registration token (team leaders who fill registration form)
// isLeader=false → no token (regular participants, just get invitation email)
router.post('/participants/bulk', authMiddleware, async (req, res) => {
  const { participants, isLeader } = req.body;
  if (!Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ error: 'participants array required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const created = [];
    for (const p of participants) {
      if (!p.player_number || !p.name || !p.email) continue;

      const playerNumber = String(p.player_number).padStart(3, '0');
      const token = isLeader ? uuidv4().replace(/-/g, '').slice(0, 32) : null;

      await conn.query(
        `INSERT INTO participants (player_number, name, email, registration_token)
         VALUES (?, ?, ?, ?)`,
        [playerNumber, p.name.trim(), p.email.trim().toLowerCase(), token]
      );

      created.push({
        player_number: playerNumber,
        name: p.name.trim(),
        email: p.email.trim().toLowerCase(),
        registration_token: token,
      });
    }

    await conn.commit();
    res.status(201).json({ created, count: created.length });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Duplicate entry found: ' + err.message });
    }
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// PATCH /api/participants/:id — update details (admin)
router.patch('/participants/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const allowed = ['name', 'email', 'player_number', 'department', 'roll_number', 'section', 'contact_number', 'year', 'is_alive'];

  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    values.push(id);
    await pool.query(`UPDATE participants SET ${updates.join(', ')} WHERE id = ?`, values);
    const [rows] = await pool.query('SELECT * FROM participants WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/participants/:id/eliminate
router.patch('/participants/:id/eliminate', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE participants SET is_alive = FALSE WHERE id = ?', [id]);
    const [rows] = await pool.query(
      'SELECT id, player_number, name, photo_url, is_alive, is_checked_in FROM participants WHERE id = ?',
      [id]
    );
    getIO().emit('participant:eliminate', rows[0]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/participants/:id/revive
router.patch('/participants/:id/revive', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE participants SET is_alive = TRUE WHERE id = ?', [id]);
    const [rows] = await pool.query(
      'SELECT id, player_number, name, photo_url, is_alive, is_checked_in FROM participants WHERE id = ?',
      [id]
    );
    getIO().emit('participant:revive', rows[0]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/participants/eliminate-bulk
router.post('/participants/eliminate-bulk', authMiddleware, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  try {
    const placeholders = ids.map(() => '?').join(',');
    await pool.query(`UPDATE participants SET is_alive = FALSE WHERE id IN (${placeholders})`, ids);
    const [rows] = await pool.query(
      `SELECT id, player_number, name, photo_url, is_alive, is_checked_in FROM participants WHERE id IN (${placeholders})`,
      ids
    );
    getIO().emit('participant:eliminate-bulk', rows);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/participants/:id — delete a participant (admin)
router.delete('/participants/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM team_members WHERE participant_id = ?', [id]);
    const [result] = await pool.query('DELETE FROM participants WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

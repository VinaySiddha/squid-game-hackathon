import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/register/:token — validate token, return leader info
router.get('/register/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT id, player_number, name, email FROM participants WHERE registration_token = ?',
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired registration link' });
    }

    const leader = rows[0];

    // Check if already submitted
    const [teams] = await pool.query(
      'SELECT id FROM teams WHERE leader_id = ?',
      [leader.id]
    );

    if (teams.length > 0) {
      return res.status(409).json({ error: 'Team already submitted for this registration link' });
    }

    res.json({ leader });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/register/:token — submit team details
router.post('/register/:token', async (req, res) => {
  const { token } = req.params;
  const { team_name, members } = req.body;

  if (!team_name || !Array.isArray(members) || members.length === 0) {
    return res.status(400).json({ error: 'team_name and members array required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [leaderRows] = await conn.query(
      'SELECT id FROM participants WHERE registration_token = ?',
      [token]
    );
    if (leaderRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Invalid registration link' });
    }
    const leaderId = leaderRows[0].id;

    const [existingTeam] = await conn.query(
      'SELECT id FROM teams WHERE leader_id = ?',
      [leaderId]
    );
    if (existingTeam.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'Team already submitted' });
    }

    const [teamResult] = await conn.query(
      'INSERT INTO teams (team_name, leader_id, is_submitted, submitted_at) VALUES (?, ?, TRUE, NOW())',
      [team_name, leaderId]
    );
    const teamId = teamResult.insertId;

    for (const member of members) {
      let participantId;

      if (member.role === 'leader') {
        participantId = leaderId;
        await conn.query(
          `UPDATE participants SET name = ?, department = ?, roll_number = ?, year = ?, section = ?, contact_number = ?
           WHERE id = ?`,
          [member.name, member.department, member.roll_number, member.year, member.section, member.contact_number, leaderId]
        );
      } else {
        const [existing] = await conn.query(
          'SELECT id FROM participants WHERE email = ?',
          [member.email.trim().toLowerCase()]
        );

        if (existing.length > 0) {
          participantId = existing[0].id;
          await conn.query(
            `UPDATE participants SET name = ?, department = ?, roll_number = ?, year = ?, section = ?, contact_number = ?
             WHERE id = ?`,
            [member.name, member.department, member.roll_number, member.year, member.section, member.contact_number, participantId]
          );
        } else {
          const [insertResult] = await conn.query(
            `INSERT INTO participants (name, email, department, roll_number, year, section, contact_number)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [member.name, member.email.trim().toLowerCase(), member.department, member.roll_number, member.year, member.section, member.contact_number]
          );
          participantId = insertResult.insertId;
        }
      }

      await conn.query(
        'INSERT INTO team_members (team_id, participant_id, role) VALUES (?, ?, ?)',
        [teamId, participantId, member.role || 'member']
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Team registered successfully', teamId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

export default router;

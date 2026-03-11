import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

router.get('/teams', authMiddleware, async (req, res) => {
  try {
    const [teams] = await pool.query(`
      SELECT t.id, t.team_name, t.is_submitted, t.submitted_at,
             p.name as leader_name, p.player_number as leader_number
      FROM teams t
      JOIN participants p ON t.leader_id = p.id
      ORDER BY t.created_at DESC
    `);

    for (const team of teams) {
      const [members] = await pool.query(`
        SELECT tm.role, p.id, p.name, p.email, p.player_number, p.department, p.roll_number, p.section, p.year, p.contact_number
        FROM team_members tm
        JOIN participants p ON tm.participant_id = p.id
        WHERE tm.team_id = ?
      `, [team.id]);
      team.members = members;
    }

    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/teams/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM teams WHERE id = ?', [req.params.id]);
    res.json({ message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

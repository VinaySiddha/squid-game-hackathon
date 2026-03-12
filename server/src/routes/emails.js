import { Router } from 'express';
import nodemailer from 'nodemailer';
import pool from '../db.js';
import { authMiddleware } from '../auth.js';
import { buildInvitationEmail } from '../email-template.js';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

router.post('/emails/send', authMiddleware, async (req, res) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const [participants] = await pool.query(
      'SELECT id, player_number, name, email, registration_token FROM participants WHERE email_sent_at IS NULL'
    );

    if (participants.length === 0) {
      return res.json({ sent: 0, failed: 0, message: 'No unsent emails found' });
    }

    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const p of participants) {
      // Only team leaders (with tokens) get registration link; others just get the invitation
      const registrationUrl = p.registration_token
        ? `${process.env.FRONTEND_URL}/register/${p.registration_token}`
        : null;
      const html = buildInvitationEmail(p.player_number, p.name, registrationUrl);

      try {
        await transporter.sendMail({
          from: `"Squid Game Hackathon" <${process.env.SMTP_USER}>`,
          to: p.email,
          subject: `Player ${p.player_number} — You Have Been Chosen`,
          html,
        });

        await pool.query('UPDATE participants SET email_sent_at = NOW() WHERE id = ?', [p.id]);
        sent++;
      } catch (err) {
        failed++;
        errors.push({ email: p.email, error: err.message });
      }
    }

    res.json({ sent, failed, errors, total: participants.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

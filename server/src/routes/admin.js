import { Router } from 'express';
import { signToken } from '../auth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

router.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = signToken();
  res.json({ token });
});

export default router;

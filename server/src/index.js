import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import sharp from 'sharp';
import { initSocket, getIO } from './socket.js';
import { authMiddleware } from './auth.js';
import pool from './db.js';
import healthRoutes from './routes/health.js';
import adminRoutes from './routes/admin.js';
import participantsRoutes from './routes/participants.js';
import registrationRoutes from './routes/registration.js';
import teamsRoutes from './routes/teams.js';
import emailsRoutes from './routes/emails.js';
import timerRoutes from './routes/timer.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

initSocket(httpServer, FRONTEND_URL);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use('/api', healthRoutes);
app.use('/api', adminRoutes);
app.use('/api', participantsRoutes);
app.use('/api', registrationRoutes);
app.use('/api', teamsRoutes);
app.use('/api', emailsRoutes);
app.use('/api', timerRoutes);

// POST /api/checkin — check in a participant with photo upload
app.post('/api/checkin', authMiddleware, upload.single('photo'), async (req, res) => {
  const { player_number } = req.body;
  if (!player_number || !req.file) {
    return res.status(400).json({ error: 'photo and player_number required' });
  }

  try {
    // Validate player exists BEFORE writing photo
    const [existing] = await pool.query(
      'SELECT id FROM participants WHERE player_number = ?',
      [player_number]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Player number not found' });
    }

    const filename = `player_${player_number}_${Date.now()}.jpg`;
    const filepath = path.join(__dirname, '..', 'uploads', filename);
    await sharp(req.file.buffer)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(filepath);

    const photoUrl = `/uploads/${filename}`;

    await pool.query(
      'UPDATE participants SET photo_url = ?, is_checked_in = TRUE WHERE player_number = ?',
      [photoUrl, player_number]
    );

    const [rows] = await pool.query(
      'SELECT id, player_number, name, photo_url, is_alive, is_checked_in FROM participants WHERE player_number = ?',
      [player_number]
    );

    getIO().emit('participant:checkin', rows[0]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, httpServer };

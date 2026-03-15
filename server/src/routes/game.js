import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../auth.js';
import { getIO } from '../socket.js';
import {
  getGameState, resetGameState, setGameState,
  setSignal, addPlayer,
} from '../gameState.js';

const router = Router();

// Preset passages for RLGL
const PRESETS = [
  { id: 1, label: 'Classic Pangram', text: 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.' },
  { id: 2, label: 'Squid Game', text: 'In the game of Squid Game, only the strongest survive. Every round brings new challenges and unexpected twists.' },
  { id: 3, label: 'Code Snippet', text: 'function fibonacci(n) { if (n <= 1) return n; return fibonacci(n - 1) + fibonacci(n - 2); }' },
  { id: 4, label: 'Shakespeare', text: 'To be or not to be, that is the question. Whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune.' },
];

// GET /api/game/presets
router.get('/game/presets', (req, res) => {
  res.json(PRESETS);
});

// POST /api/game/create
router.post('/game/create', authMiddleware, async (req, res) => {
  const { gameType, config } = req.body;
  if (!gameType || !config) {
    return res.status(400).json({ error: 'gameType and config required' });
  }
  try {
    const [existing] = await pool.query(
      "SELECT id FROM game_sessions WHERE status IN ('waiting', 'active') LIMIT 1"
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A game session is already active. End it first.' });
    }

    const [result] = await pool.query(
      'INSERT INTO game_sessions (game_type, config, status) VALUES (?, ?, ?)',
      [gameType, JSON.stringify(config), 'waiting']
    );

    resetGameState();
    setGameState({
      sessionId: result.insertId,
      gameType,
      config,
      status: 'waiting',
    });

    res.json({ sessionId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/game/join
router.post('/game/join', async (req, res) => {
  const { playerNumber } = req.body;
  if (!playerNumber) {
    return res.status(400).json({ error: 'playerNumber required' });
  }
  try {
    const gs = getGameState();
    if (!gs.sessionId) {
      return res.status(404).json({ error: 'No game session available' });
    }
    if (gs.status === 'finished') {
      return res.status(400).json({ error: 'Game has already ended' });
    }

    const padded = String(playerNumber).padStart(3, '0');
    const [rows] = await pool.query(
      'SELECT id, player_number, name, is_alive, is_checked_in FROM participants WHERE player_number = ?',
      [padded]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    const player = rows[0];
    if (!player.is_checked_in) {
      return res.status(400).json({ error: 'Player not checked in' });
    }
    if (!player.is_alive) {
      return res.status(400).json({ error: 'Player has been eliminated' });
    }

    await pool.query(
      'INSERT IGNORE INTO game_players (session_id, participant_id) VALUES (?, ?)',
      [gs.sessionId, player.id]
    );

    addPlayer(player.id, {
      participantId: player.id,
      playerNumber: player.player_number,
      name: player.name,
    });

    res.json({
      playerId: player.id,
      playerNumber: player.player_number,
      playerName: player.name,
      sessionId: gs.sessionId,
      gameType: gs.gameType,
      status: gs.status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/game/start
router.post('/game/start', authMiddleware, async (req, res) => {
  try {
    const gs = getGameState();
    if (!gs.sessionId || gs.status !== 'waiting') {
      return res.status(400).json({ error: 'No waiting game to start' });
    }

    const now = new Date();
    await pool.query(
      "UPDATE game_sessions SET status = 'active', started_at = ? WHERE id = ?",
      [now, gs.sessionId]
    );

    setGameState({ status: 'active' });

    const config = gs.config;
    const timerDuration = config.timerDuration || 120;

    // Game timer
    const gameTimer = setTimeout(async () => {
      await endGame(gs.sessionId, 'timer');
    }, timerDuration * 1000);
    setGameState({ gameTimer });

    // RLGL auto mode
    if (gs.gameType === 'rlgl' && config.signalMode === 'auto') {
      startAutoCycle(config);
    }

    // Glass Bridge: generate bridge and player order
    if (gs.gameType === 'glassbridge') {
      const steps = config.steps || 10;
      const bridge = [];
      for (let i = 0; i < steps; i++) {
        bridge.push({ safe: Math.random() < 0.5 ? 'left' : 'right' });
      }
      const playerIds = Array.from(gs.players.keys());
      setGameState({
        bridge,
        playerOrder: playerIds,
        currentPlayerIdx: 0,
        currentStep: 0,
      });
    }

    // Tug of War: set up matchups
    if (gs.gameType === 'tugofwar' && config.matchups) {
      setGameState({ matchups: config.matchups });
    }

    const io = getIO();
    io.emit('game:start', {
      gameType: gs.gameType,
      config: gs.config,
      timerDurationMs: timerDuration * 1000,
      startedAt: now.toISOString(),
    });

    // Glass Bridge: announce first player
    if (gs.gameType === 'glassbridge' && gs.playerOrder.length > 0) {
      const firstId = gs.playerOrder[0];
      const [p] = await pool.query('SELECT player_number, name FROM participants WHERE id = ?', [firstId]);
      if (p.length > 0) {
        io.emit('game:bridge-next-player', { playerNumber: p[0].player_number, name: p[0].name });
      }
    }

    res.json({ status: 'active', startedAt: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/game/signal
router.post('/game/signal', authMiddleware, (req, res) => {
  const { signal } = req.body;
  const gs = getGameState();
  if (!gs.sessionId || gs.status !== 'active') {
    return res.status(400).json({ error: 'No active game' });
  }
  if (signal !== 'red' && signal !== 'green') {
    return res.status(400).json({ error: 'signal must be red or green' });
  }

  setSignal(signal);
  pool.query('UPDATE game_sessions SET current_signal = ? WHERE id = ?', [signal, gs.sessionId]);
  const io = getIO();
  io.emit('game:signal', { signal });
  // Play red/green light sound effect on the wall
  const sfxPath = signal === 'red'
    ? '/uploads/SquidGameAudios/sfx/Red Light.mp3'
    : '/uploads/SquidGameAudios/sfx/Green Light.mp3';
  io.emit('audio:update', { action: 'sfx', value: sfxPath });
  res.json({ signal });
});

// POST /api/game/end
router.post('/game/end', authMiddleware, async (req, res) => {
  try {
    const gs = getGameState();
    if (!gs.sessionId) {
      return res.status(400).json({ error: 'No active game' });
    }
    await endGame(gs.sessionId, 'admin');
    res.json({ status: 'finished' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/game/status
router.get('/game/status', async (req, res) => {
  try {
    const gs = getGameState();
    if (!gs.sessionId) {
      return res.json({ active: false });
    }

    const [players] = await pool.query(
      `SELECT gp.*, p.player_number, p.name
       FROM game_players gp
       JOIN participants p ON p.id = gp.participant_id
       WHERE gp.session_id = ?`,
      [gs.sessionId]
    );

    res.json({
      active: true,
      sessionId: gs.sessionId,
      gameType: gs.gameType,
      config: gs.config,
      status: gs.status,
      currentSignal: gs.currentSignal,
      players,
      stats: {
        total: players.length,
        alive: players.filter(p => !p.is_eliminated).length,
        eliminated: players.filter(p => p.is_eliminated).length,
        finished: players.filter(p => p.is_finished).length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/game/mingle-call — Admin calls a number for Mingle Game
router.post('/game/mingle-call', authMiddleware, async (req, res) => {
  const { number, timeLimit } = req.body;
  const gs = getGameState();
  if (!gs.sessionId || gs.status !== 'active' || gs.gameType !== 'mingle') {
    return res.status(400).json({ error: 'No active mingle game' });
  }
  if (!number || number < 2) {
    return res.status(400).json({ error: 'Number must be >= 2' });
  }

  const limit = timeLimit || 10;

  // Get alive player count to calculate room count
  const [alivePlayers] = await pool.query(
    `SELECT gp.participant_id FROM game_players gp
     WHERE gp.session_id = ? AND gp.is_eliminated = FALSE`,
    [gs.sessionId]
  );

  const totalAlive = alivePlayers.length;
  const roomCount = Math.ceil(totalAlive / number) + 2; // extra rooms for scramble

  // Create rooms
  const rooms = [];
  for (let i = 0; i < roomCount; i++) {
    rooms.push({
      id: `room-${i + 1}`,
      players: [],
      capacity: number,
      full: false,
    });
  }

  setGameState({ mingleRooms: rooms, mingleNumber: number });

  // Broadcast round start
  const io = getIO();
  io.emit('game:mingle-round', {
    number,
    rooms: rooms.map(r => ({ id: r.id, players: [], capacity: r.capacity, full: false })),
    timeLimit: limit,
  });

  // Play the song pause / announcement sound
  io.emit('audio:update', { action: 'sfx', value: '/uploads/SquidGameAudios/sfx/Whistle blow.mp3' });

  // Set timer for round end
  if (gs.mingleTimer) clearTimeout(gs.mingleTimer);
  const mingleTimer = setTimeout(async () => {
    await endMingleRound(gs.sessionId);
  }, limit * 1000);
  setGameState({ mingleTimer });

  res.json({ number, roomCount, timeLimit: limit });
});

// POST /api/game/tow-start-matchup — Start a specific tug of war matchup (admin)
router.post('/game/tow-start-matchup', authMiddleware, async (req, res) => {
  const { matchupIndex } = req.body;
  const gs = getGameState();
  if (!gs.sessionId || gs.status !== 'active' || gs.gameType !== 'tugofwar') {
    return res.status(400).json({ error: 'No active tug of war game' });
  }

  const matchups = gs.matchups || [];
  if (matchupIndex < 0 || matchupIndex >= matchups.length) {
    return res.status(400).json({ error: 'Invalid matchup index' });
  }

  const matchup = matchups[matchupIndex];

  // Get team member participant IDs
  const [t1Members] = await pool.query(
    'SELECT participant_id FROM team_members WHERE team_id = ?',
    [matchup.team1Id]
  );
  const [t2Members] = await pool.query(
    'SELECT participant_id FROM team_members WHERE team_id = ?',
    [matchup.team2Id]
  );

  const activeMatchup = {
    ...matchup,
    team1Players: t1Members.map(m => m.participant_id),
    team2Players: t2Members.map(m => m.participant_id),
    team1Clicks: 0,
    team2Clicks: 0,
  };

  setGameState({ activeMatchup, ropePosition: 0 });

  getIO().emit('game:tow-matchup-start', {
    team1Name: matchup.team1Name,
    team2Name: matchup.team2Name,
    matchupIndex,
  });

  res.json({ matchup: activeMatchup });
});

// ─── Helper: End Mingle Round ───
async function endMingleRound(sessionId) {
  const gs = getGameState();
  if (!gs.mingleRooms) return;

  const number = gs.mingleNumber;
  const rooms = gs.mingleRooms;

  // Find players NOT in a full room
  const safePlayerIds = new Set();
  const allJoinedIds = new Set();

  for (const room of rooms) {
    for (const p of room.players) {
      allJoinedIds.add(p.participantId);
    }
    // Only players in rooms that are exactly full are safe
    if (room.players.length === number) {
      for (const p of room.players) {
        safePlayerIds.add(p.participantId);
      }
    }
  }

  // Get all alive players in this session
  const [alivePlayers] = await pool.query(
    `SELECT gp.participant_id, p.player_number, p.name
     FROM game_players gp
     JOIN participants p ON p.id = gp.participant_id
     WHERE gp.session_id = ? AND gp.is_eliminated = FALSE`,
    [sessionId]
  );

  // Eliminate: players not in a full room (including those who didn't join any room)
  const toEliminate = alivePlayers.filter(p => !safePlayerIds.has(p.participant_id));

  for (const p of toEliminate) {
    await eliminatePlayer(sessionId, p.participant_id, 'no_complete_group');
  }

  const survivors = alivePlayers.filter(p => safePlayerIds.has(p.participant_id))
    .map(p => ({ playerNumber: p.player_number, name: p.name }));
  const eliminated = toEliminate
    .map(p => ({ playerNumber: p.player_number, name: p.name }));

  const io = getIO();
  io.emit('game:mingle-round-end', { eliminated, survivors });

  // Clear rooms
  setGameState({ mingleRooms: null, mingleNumber: null, mingleTimer: null });
}

// ─── Helper: End Game ───
async function endGame(sessionId, reason) {
  const gs = getGameState();
  if (gs.gameTimer) clearTimeout(gs.gameTimer);
  if (gs.autoTimer) clearTimeout(gs.autoTimer);

  // Eliminate unfinished players
  const [unfinished] = await pool.query(
    `SELECT gp.participant_id, p.player_number, p.name
     FROM game_players gp
     JOIN participants p ON p.id = gp.participant_id
     WHERE gp.session_id = ? AND gp.is_finished = FALSE AND gp.is_eliminated = FALSE`,
    [sessionId]
  );

  if (unfinished.length > 0) {
    const ids = unfinished.map(p => p.participant_id);
    const placeholders = ids.map(() => '?').join(',');

    await pool.query(
      `UPDATE game_players SET is_eliminated = TRUE, eliminated_reason = 'time_up'
       WHERE session_id = ? AND participant_id IN (${placeholders})`,
      [sessionId, ...ids]
    );

    await pool.query(
      `UPDATE participants SET is_alive = FALSE WHERE id IN (${placeholders})`,
      ids
    );

    const io = getIO();
    for (const p of unfinished) {
      io.emit('participant:eliminate', {
        id: p.participant_id, player_number: p.player_number,
        name: p.name, is_alive: false,
      });
    }
  }

  const [allPlayers] = await pool.query(
    `SELECT gp.*, p.player_number, p.name
     FROM game_players gp
     JOIN participants p ON p.id = gp.participant_id
     WHERE gp.session_id = ?`,
    [sessionId]
  );

  const survivors = allPlayers.filter(p => !p.is_eliminated).map(p => ({
    playerNumber: p.player_number, name: p.name,
  }));
  const eliminated = allPlayers.filter(p => p.is_eliminated).map(p => ({
    playerNumber: p.player_number, name: p.name, reason: p.eliminated_reason,
  }));

  await pool.query(
    "UPDATE game_sessions SET status = 'finished', ended_at = NOW() WHERE id = ?",
    [sessionId]
  );

  getIO().emit('game:end', { reason, survivors, eliminated });
  resetGameState();
}

// ─── Helper: Auto signal cycling ───
function startAutoCycle(config) {
  const greenMin = (config.autoGreenMin || 3) * 1000;
  const greenMax = (config.autoGreenMax || 8) * 1000;
  const redMin = (config.autoRedMin || 2) * 1000;
  const redMax = (config.autoRedMax || 5) * 1000;

  function cycle() {
    const currentGs = getGameState();
    if (currentGs.status !== 'active') return;

    const isGreen = currentGs.currentSignal === 'green';
    const nextSignal = isGreen ? 'red' : 'green';
    setSignal(nextSignal);
    pool.query('UPDATE game_sessions SET current_signal = ? WHERE id = ?',
      [nextSignal, currentGs.sessionId]);
    const io = getIO();
    io.emit('game:signal', { signal: nextSignal });
    // Play signal sound on the wall
    const sfxPath = nextSignal === 'red'
      ? '/uploads/SquidGameAudios/sfx/Red Light.mp3'
      : '/uploads/SquidGameAudios/sfx/Green Light.mp3';
    io.emit('audio:update', { action: 'sfx', value: sfxPath });

    const minDelay = nextSignal === 'green' ? greenMin : redMin;
    const maxDelay = nextSignal === 'green' ? greenMax : redMax;
    const delay = minDelay + Math.random() * (maxDelay - minDelay);

    const timer = setTimeout(cycle, delay);
    setGameState({ autoTimer: timer });
  }

  const initialDelay = greenMin + Math.random() * (greenMax - greenMin);
  const timer = setTimeout(cycle, initialDelay);
  setGameState({ autoTimer: timer });
}

// ─── Helper: Eliminate a single player ───
export async function eliminatePlayer(sessionId, participantId, reason) {
  await pool.query(
    'UPDATE game_players SET is_eliminated = TRUE, eliminated_reason = ? WHERE session_id = ? AND participant_id = ?',
    [reason, sessionId, participantId]
  );
  await pool.query('UPDATE participants SET is_alive = FALSE WHERE id = ?', [participantId]);

  const [rows] = await pool.query(
    'SELECT id, player_number, name, is_alive FROM participants WHERE id = ?',
    [participantId]
  );

  const io = getIO();
  io.emit('game:player-eliminated', {
    playerNumber: rows[0].player_number, name: rows[0].name, reason,
  });
  io.emit('participant:eliminate', rows[0]);
  // Play player elimination announcement audio on the wall
  io.emit('audio:update', { action: 'player-announce', value: rows[0].player_number });
}

export default router;

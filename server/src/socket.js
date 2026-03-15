import { Server } from 'socket.io';
import pool from './db.js';
import {
  getGameState, setGameState, setSignal, isInGracePeriod,
} from './gameState.js';

let io;

export function initSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
    // Performance tuning for 2000+ concurrent users
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6,       // 1MB max message size
    perMessageDeflate: false,      // Disable compression for lower CPU
    httpCompression: false,
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('audio:control', (data) => {
      io.emit('audio:update', data);
    });

    socket.on('announce', (data) => {
      io.emit('announce', data);
    });

    socket.on('timer:show', (visible) => {
      io.emit('timer:show', visible);
    });

    socket.on('panel:mute-game-sounds', (muted) => {
      io.emit('panel:mute-game-sounds', muted);
    });

    // ─── Game Events ───

    // Player joins game via socket (binds identity)
    socket.on('game:join', async ({ playerNumber }) => {
      try {
        const padded = String(playerNumber).padStart(3, '0');
        const [rows] = await pool.query(
          'SELECT id, player_number, name FROM participants WHERE player_number = ?',
          [padded]
        );
        if (rows.length > 0) {
          socket.participantId = rows[0].id;
          socket.playerNumber = rows[0].player_number;
          socket.playerName = rows[0].name;
          socket.join('game');
        }
      } catch (err) {
        console.error('game:join error:', err);
      }
    });

    // RLGL: Player keystroke (throttled — only process if signal is red)
    socket.on('game:keystroke', async () => {
      if (!socket.participantId) return;
      try {
        const gs = getGameState();
        if (gs.status !== 'active' || gs.gameType !== 'rlgl') return;
        // Skip processing if signal is green (no violation possible)
        if (gs.currentSignal === 'green') return;

        if (gs.currentSignal === 'red' && !isInGracePeriod()) {
          const config = gs.config;
          if (config.eliminationMode === 'instant') {
            const { eliminatePlayer } = await import('./routes/game.js');
            await eliminatePlayer(gs.sessionId, socket.participantId, 'typed_during_red');
          } else {
            const [rows] = await pool.query(
              'SELECT strikes_used FROM game_players WHERE session_id = ? AND participant_id = ?',
              [gs.sessionId, socket.participantId]
            );
            if (rows.length > 0) {
              const newStrikes = rows[0].strikes_used + 1;
              if (newStrikes >= config.strikeCount) {
                const { eliminatePlayer } = await import('./routes/game.js');
                await eliminatePlayer(gs.sessionId, socket.participantId, 'max_strikes');
              } else {
                await pool.query(
                  'UPDATE game_players SET strikes_used = ? WHERE session_id = ? AND participant_id = ?',
                  [newStrikes, gs.sessionId, socket.participantId]
                );
                socket.emit('game:strike', { strikes: newStrikes, max: config.strikeCount });
              }
            }
          }
        }
      } catch (err) {
        console.error('game:keystroke error:', err);
      }
    });

    // Player progress update (throttled — store in memory, batch write to DB)
    socket.on('game:progress', ({ typedLength }) => {
      if (!socket.participantId) return;
      const gs = getGameState();
      if (gs.status !== 'active') return;

      // Store in memory (no DB write per event for 2000 users)
      const player = gs.players.get(socket.participantId);
      if (player) player.progress = typedLength;

      // Debounce DB write per socket
      if (socket._progressTimer) clearTimeout(socket._progressTimer);
      socket._progressTimer = setTimeout(() => {
        pool.query(
          'UPDATE game_players SET progress = ? WHERE session_id = ? AND participant_id = ?',
          [typedLength, gs.sessionId, socket.participantId]
        ).catch(() => {});
      }, 2000);
    });

    // Player completed (RLGL)
    socket.on('game:complete', async ({ typedText }) => {
      if (!socket.participantId) return;
      try {
        const gs = getGameState();
        if (gs.status !== 'active') return;

        if (gs.gameType === 'rlgl' && typedText !== gs.config.passage) {
          socket.emit('game:complete-rejected', { reason: 'Text does not match passage' });
          return;
        }

        await pool.query(
          'UPDATE game_players SET is_finished = TRUE, finished_at = NOW(), progress = ? WHERE session_id = ? AND participant_id = ?',
          [typedText?.length || 0, gs.sessionId, socket.participantId]
        );
        io.emit('game:player-finished', { playerNumber: socket.playerNumber, name: socket.playerName });
      } catch (err) {
        console.error('game:complete error:', err);
      }
    });

    // Tug of War: Player click
    socket.on('game:tow-click', () => {
      if (!socket.participantId) return;
      const gs = getGameState();
      if (gs.status !== 'active' || gs.gameType !== 'tugofwar') return;

      const matchup = gs.activeMatchup;
      if (!matchup) return;

      if (matchup.team1Players.includes(socket.participantId)) {
        matchup.team1Clicks++;
      } else if (matchup.team2Players.includes(socket.participantId)) {
        matchup.team2Clicks++;
      } else {
        return;
      }

      const total = matchup.team1Clicks + matchup.team2Clicks || 1;
      const position = ((matchup.team1Clicks - matchup.team2Clicks) / total) * 100;
      setGameState({ ropePosition: position });

      io.emit('game:tow-update', {
        ropePosition: position,
        team1Clicks: matchup.team1Clicks,
        team2Clicks: matchup.team2Clicks,
      });

      // Check win condition (threshold ±80)
      if (Math.abs(position) >= 80) {
        const losingTeamPlayers = position > 0 ? matchup.team2Players : matchup.team1Players;
        (async () => {
          const { eliminatePlayer } = await import('./routes/game.js');
          for (const pid of losingTeamPlayers) {
            await eliminatePlayer(gs.sessionId, pid, 'tug_of_war_loss');
          }
          io.emit('game:tow-matchup-end', {
            winner: position > 0 ? matchup.team1Name : matchup.team2Name,
            loser: position > 0 ? matchup.team2Name : matchup.team1Name,
          });
          setGameState({ activeMatchup: null, ropePosition: 0 });
        })();
      }
    });

    // Glass Bridge: Player choice
    socket.on('game:bridge-choice', async ({ choice }) => {
      if (!socket.participantId) return;
      try {
        const gs = getGameState();
        if (gs.status !== 'active' || gs.gameType !== 'glassbridge') return;
        if (choice !== 'left' && choice !== 'right') return;

        const currentPlayer = gs.playerOrder[gs.currentPlayerIdx];
        if (currentPlayer !== socket.participantId) return;

        const step = gs.bridge[gs.currentStep];
        const safe = step.safe;

        if (choice === safe) {
          gs.currentStep++;
          io.emit('game:bridge-step', {
            playerNumber: socket.playerNumber,
            step: gs.currentStep - 1,
            choice,
            result: 'safe',
          });

          if (gs.currentStep >= gs.bridge.length) {
            await pool.query(
              'UPDATE game_players SET is_finished = TRUE, finished_at = NOW() WHERE session_id = ? AND participant_id = ?',
              [gs.sessionId, socket.participantId]
            );
            io.emit('game:player-finished', { playerNumber: socket.playerNumber, name: socket.playerName });

            gs.currentPlayerIdx++;
            gs.currentStep = 0;
            if (gs.currentPlayerIdx < gs.playerOrder.length) {
              const nextId = gs.playerOrder[gs.currentPlayerIdx];
              const [nextP] = await pool.query('SELECT player_number, name FROM participants WHERE id = ?', [nextId]);
              if (nextP.length > 0) {
                io.emit('game:bridge-next-player', { playerNumber: nextP[0].player_number, name: nextP[0].name });
              }
            }
          }
        } else {
          io.emit('game:bridge-step', {
            playerNumber: socket.playerNumber,
            step: gs.currentStep,
            choice,
            result: 'fall',
          });

          const { eliminatePlayer } = await import('./routes/game.js');
          await eliminatePlayer(gs.sessionId, socket.participantId, 'wrong_panel');

          gs.currentPlayerIdx++;
          gs.currentStep = 0;
          if (gs.currentPlayerIdx < gs.playerOrder.length) {
            const nextId = gs.playerOrder[gs.currentPlayerIdx];
            const [nextP] = await pool.query('SELECT player_number, name FROM participants WHERE id = ?', [nextId]);
            if (nextP.length > 0) {
              io.emit('game:bridge-next-player', { playerNumber: nextP[0].player_number, name: nextP[0].name });
            }
          }
        }
      } catch (err) {
        console.error('game:bridge-choice error:', err);
      }
    });

    // Mingle: Player joins a room
    socket.on('game:mingle-join-room', async ({ roomId }) => {
      if (!socket.participantId) return;
      try {
        const gs = getGameState();
        if (gs.status !== 'active' || gs.gameType !== 'mingle') return;
        if (!gs.mingleRooms) return;

        const room = gs.mingleRooms.find(r => r.id === roomId);
        if (!room || room.full) return;

        // Check player isn't already in a room
        const alreadyInRoom = gs.mingleRooms.some(r =>
          r.players.some(p => p.participantId === socket.participantId)
        );
        if (alreadyInRoom) return;

        room.players.push({
          participantId: socket.participantId,
          playerNumber: socket.playerNumber,
          name: socket.playerName,
        });

        if (room.players.length >= room.capacity) {
          room.full = true;
        }

        io.emit('game:mingle-room-update', {
          roomId: room.id,
          players: room.players.map(p => ({ playerNumber: p.playerNumber, name: p.name })),
          full: room.full,
        });
      } catch (err) {
        console.error('game:mingle-join-room error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

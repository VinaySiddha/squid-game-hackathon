// In-memory game state — source of truth for real-time game data
// DB is updated periodically as backup

let state = {
  sessionId: null,
  gameType: null,
  config: null,
  currentSignal: 'green',
  signalChangedAt: 0,
  autoTimer: null,
  gameTimer: null,
  players: new Map(),
  status: null,

  // Tug of War
  matchups: [],
  activeMatchup: null,
  ropePosition: 0,

  // Glass Bridge
  bridge: [],
  currentStep: 0,
  playerOrder: [],
  currentPlayerIdx: 0,

  // Mingle
  mingleRooms: null,
  mingleNumber: null,
  mingleTimer: null,
};

const GRACE_PERIOD_MS = 300;

export function getGameState() {
  return state;
}

export function resetGameState() {
  if (state.autoTimer) clearTimeout(state.autoTimer);
  if (state.gameTimer) clearTimeout(state.gameTimer);
  if (state.mingleTimer) clearTimeout(state.mingleTimer);
  state = {
    sessionId: null, gameType: null, config: null,
    currentSignal: 'green', signalChangedAt: 0,
    autoTimer: null, gameTimer: null,
    players: new Map(), status: null,
    matchups: [], activeMatchup: null, ropePosition: 0,
    bridge: [], currentStep: 0, playerOrder: [], currentPlayerIdx: 0,
    mingleRooms: null, mingleNumber: null, mingleTimer: null,
  };
}

export function setSignal(signal) {
  state.currentSignal = signal;
  state.signalChangedAt = Date.now();
}

export function isInGracePeriod() {
  return (Date.now() - state.signalChangedAt) < GRACE_PERIOD_MS;
}

export function addPlayer(participantId, data) {
  state.players.set(participantId, data);
}

export function removePlayer(participantId) {
  state.players.delete(participantId);
}

export function getPlayer(participantId) {
  return state.players.get(participantId);
}

export function setGameState(updates) {
  Object.assign(state, updates);
}

export function getAllPlayers() {
  return Array.from(state.players.values());
}

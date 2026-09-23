// server.js
// Server otoritas tunggal untuk boardgame kartu 4 pemain, 1 sesi per waktu.
// Semua state kartu disimpan di sini. Client TIDAK PERNAH menerima kartu
// privat milik pemain lain — itu yang bikin area privat benar-benar privat.

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const MAX_PLAYERS = 4;

// ---------------------------------------------------------------------------
// GAME STATE (in-memory, cukup untuk 1 sesi aktif pada satu waktu)
// ---------------------------------------------------------------------------
function freshDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];
  let id = 1;
  for (const s of suits) {
    for (const v of values) {
      deck.push({ id: `c${id++}`, suit: s, value: v, label: `${v}${s}` });
    }
  }
  return deck;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let state = {
  started: false,
  deck: freshDeck(),
  openCards: [],        // kartu terbuka di meja publik (opsional, belum dipakai UI)
  turnOrder: [],         // array playerId sesuai urutan join
  currentTurnIndex: 0,
  players: {},           // playerId -> { name, arranging: [], storage: [], revealed: [], isRevealed: bool }
};
shuffle(state.deck);

// ---------------------------------------------------------------------------
// VALIDASI SUSUNAN KARTU — TITIK EKSTENSI
// Aturan belum fix. Ganti isi fungsi ini nanti sesuai aturan game kamu.
// Kembalikan { valid: true } atau { valid: false, reason: '...' }
// ---------------------------------------------------------------------------
function validateArrangement(arrangingCards) {
  // TODO: isi aturan sebenarnya di sini (mis. harus set/run, minimal N kartu, dst)
  if (arrangingCards.length === 0) {
    return { valid: false, reason: 'Belum ada kartu yang disusun.' };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// HELPER: kirim state ke client
// ---------------------------------------------------------------------------
function publicPlayerView(pid) {
  const p = state.players[pid];
  return {
    id: pid,
    name: p.name,
    cardCountArranging: p.arranging.length,
    cardCountStorage: p.storage.length,
    revealed: p.revealed,
    isRevealed: p.isRevealed,
  };
}

function broadcastPublicState() {
  const payload = {
    started: state.started,
    deckCount: state.deck.length,
    openCards: state.openCards,
    turnOrder: state.turnOrder,
    currentTurnPlayerId: state.turnOrder[state.currentTurnIndex] || null,
    players: state.turnOrder.map(publicPlayerView),
  };
  io.emit('state:public', payload);
}

function sendPrivateState(socketId) {
  const p = state.players[socketId];
  if (!p) return;
  io.to(socketId).emit('state:private', {
    arranging: p.arranging,
    storage: p.storage,
  });
}

function isMyTurn(playerId) {
  return state.turnOrder[state.currentTurnIndex] === playerId;
}

// ---------------------------------------------------------------------------
// SOCKET HANDLERS
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  socket.on('join', ({ name }) => {
    if (state.turnOrder.length >= MAX_PLAYERS) {
      socket.emit('errorMsg', 'Sesi sudah penuh (4 pemain).');
      return;
    }
    state.players[socket.id] = {
      name: name?.trim() || `Pemain ${state.turnOrder.length + 1}`,
      arranging: [],
      storage: [],
      revealed: [],
      isRevealed: false,
    };
    state.turnOrder.push(socket.id);

    if (state.turnOrder.length === MAX_PLAYERS) {
      state.started = true;
      state.currentTurnIndex = 0;
    }

    socket.emit('joined', { playerId: socket.id });
    sendPrivateState(socket.id);
    broadcastPublicState();
  });

  socket.on('shuffleDeck', () => {
    if (!state.started || !isMyTurn(socket.id)) return;
    shuffle(state.deck);
    broadcastPublicState();
  });

  socket.on('drawCard', () => {
    if (!state.started || !isMyTurn(socket.id)) return;
    if (state.deck.length === 0) return;
    const card = state.deck.pop();
    state.players[socket.id].storage.push(card);
    sendPrivateState(socket.id);
    broadcastPublicState();
  });

  // Menyusun/memindah kartu di area privat sendiri: boleh kapan saja (bukan cuma giliran)
  socket.on('moveCard', ({ cardId, from, to }) => {
    const p = state.players[socket.id];
    if (!p) return;
    if (!['storage', 'arranging'].includes(from) || !['storage', 'arranging'].includes(to)) return;
    const idx = p[from].findIndex((c) => c.id === cardId);
    if (idx === -1) return;
    const [card] = p[from].splice(idx, 1);
    p[to].push(card);
    sendPrivateState(socket.id);
    broadcastPublicState(); // supaya jumlah kartu publik lawan ikut update
  });

  socket.on('revealArrangement', () => {
    const p = state.players[socket.id];
    if (!state.started || !isMyTurn(socket.id) || !p) return;
    const check = validateArrangement(p.arranging);
    if (!check.valid) {
      socket.emit('errorMsg', check.reason);
      return;
    }
    p.revealed = p.arranging;
    p.arranging = [];
    p.isRevealed = true;
    sendPrivateState(socket.id);
    broadcastPublicState();
  });

  socket.on('endTurn', () => {
    if (!state.started || !isMyTurn(socket.id)) return;
    state.currentTurnIndex = (state.currentTurnIndex + 1) % state.turnOrder.length;
    broadcastPublicState();
  });

  socket.on('disconnect', () => {
    if (!state.players[socket.id]) return;
    delete state.players[socket.id];
    state.turnOrder = state.turnOrder.filter((id) => id !== socket.id);
    state.started = false; // sesi butuh 4 pemain lagi kalau ada yang keluar
    if (state.currentTurnIndex >= state.turnOrder.length) state.currentTurnIndex = 0;
    broadcastPublicState();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));

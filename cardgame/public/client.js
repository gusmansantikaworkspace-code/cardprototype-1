const socket = io();
let myId = null;

const joinScreen = document.getElementById('joinScreen');
const gameScreen = document.getElementById('gameScreen');
const nameInput = document.getElementById('nameInput');
const joinBtn = document.getElementById('joinBtn');
const joinError = document.getElementById('joinError');

const turnBanner = document.getElementById('turnBanner');
const deckCount = document.getElementById('deckCount');
const shuffleBtn = document.getElementById('shuffleBtn');
const drawBtn = document.getElementById('drawBtn');
const playersStrip = document.getElementById('playersStrip');
const arrangingCards = document.getElementById('arrangingCards');
const storageCards = document.getElementById('storageCards');
const revealBtn = document.getElementById('revealBtn');
const endTurnBtn = document.getElementById('endTurnBtn');
const actionError = document.getElementById('actionError');

joinBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) { joinError.textContent = 'Isi nama dulu.'; return; }
  socket.emit('join', { name });
});

socket.on('joined', ({ playerId }) => {
  myId = playerId;
  joinScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
});

socket.on('errorMsg', (msg) => {
  joinError.textContent = msg;
  actionError.textContent = msg;
  setTimeout(() => { actionError.textContent = ''; }, 3000);
});

function cardEl(card, mini = false) {
  const el = document.createElement('div');
  el.className = 'card' + (mini ? ' mini' : '');
  if (card.suit === '♥' || card.suit === '♦') el.classList.add('red');
  el.textContent = card.label;
  el.dataset.id = card.id;
  return el;
}

let lastPublic = null;

socket.on('state:public', (data) => {
  lastPublic = data;
  renderPublic(data);
});

socket.on('state:private', (data) => {
  renderPrivate(data);
});

function renderPublic(data) {
  deckCount.textContent = `${data.deckCount} kartu`;

  const myTurn = data.currentTurnPlayerId === myId;
  turnBanner.textContent = !data.started
    ? `Menunggu pemain... (${data.players.length}/4)`
    : myTurn
      ? 'Giliran kamu!'
      : `Giliran: ${data.players.find(p => p.id === data.currentTurnPlayerId)?.name || '-'}`;
  turnBanner.classList.toggle('mine', myTurn);

  shuffleBtn.disabled = !myTurn;
  drawBtn.disabled = !myTurn || data.deckCount === 0;
  revealBtn.disabled = !myTurn;
  endTurnBtn.disabled = !myTurn;

  playersStrip.innerHTML = '';
  data.players.forEach((p) => {
    const div = document.createElement('div');
    div.className = 'player-card' + (p.id === data.currentTurnPlayerId ? ' active' : '');
    const mineTag = p.id === myId ? ' (saya)' : '';
    div.innerHTML = `
      <div class="pname">${p.name}${mineTag}</div>
      <div class="pinfo">
        Menyusun: ${p.cardCountArranging} · Simpanan: ${p.cardCountStorage}<br>
        ${p.isRevealed ? 'Sudah ditunjukkan' : 'Belum ditunjukkan'}
      </div>
      <div class="revealed-cards"></div>
    `;
    const revealedRow = div.querySelector('.revealed-cards');
    p.revealed.forEach((c) => revealedRow.appendChild(cardEl(c, true)));
    playersStrip.appendChild(div);
  });
}

function renderPrivate(data) {
  arrangingCards.innerHTML = '';
  data.arranging.forEach((c) => {
    const el = cardEl(c);
    el.addEventListener('click', () => moveCard(c.id, 'arranging', 'storage'));
    el.title = 'Klik untuk pindah ke Penyimpanan';
    arrangingCards.appendChild(el);
  });

  storageCards.innerHTML = '';
  data.storage.forEach((c) => {
    const el = cardEl(c);
    el.addEventListener('click', () => moveCard(c.id, 'storage', 'arranging'));
    el.title = 'Klik untuk pindah ke Area Merangkai';
    storageCards.appendChild(el);
  });
}

function moveCard(cardId, from, to) {
  socket.emit('moveCard', { cardId, from, to });
}

shuffleBtn.addEventListener('click', () => socket.emit('shuffleDeck'));
drawBtn.addEventListener('click', () => socket.emit('drawCard'));
revealBtn.addEventListener('click', () => socket.emit('revealArrangement'));
endTurnBtn.addEventListener('click', () => socket.emit('endTurn'));

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ================= CONFIG =================
const GATE_SPEED = 2.5;
const ENEMY_SPEED = 3;
const CLASH_DELAY = 140;
const GATES_PER_CRATE = 5;

// ================= STATE =================
let level = 1;
let ballCount = 1;
let score = 0;
let bestScore = localStorage.getItem("bestScore") || 0;

let gatesPassed = 0;
let cratesSpawned = 0;

let gameState = "RUN";
let paused = false;
let clashCooldown = false;

let touchX = canvas.width / 2;

// ================= UI =================
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
bestEl.textContent = bestScore;

document.getElementById("pauseBtn").onclick = () => paused = !paused;
document.getElementById("homeBtn").onclick = () => resetGame(true);

// ================= PLAYER =================
const player = {
  x: canvas.width / 2,
  y: canvas.height - 120,
  radius: 10
};

// ================= OBJECTS =================
let gates = [];
let crates = [];
let enemies = [];

// ================= INPUT =================
canvas.addEventListener("mousemove", e => touchX = e.clientX);
canvas.addEventListener("touchmove", e => touchX = e.touches[0].clientX, { passive: true });

// ================= HELPERS =================
function circleRectCollide(cx, cy, r, rect) {
  const x = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const y = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - x;
  const dy = cy - y;
  return dx * dx + dy * dy < r * r;
}

// 🔥 CHECK ALL PLAYER BALLS
function anyPlayerBallHits(rect) {
  for (let i = 0; i < ballCount; i++) {
    const bx = player.x + i * 22;
    if (circleRectCollide(bx, player.y, player.radius, rect)) {
      return true;
    }
  }
  return false;
}

// ================= SPAWN =================
function spawnGate() {
  const ops = ["*2", "/2", "*3"];
  gates.push({
    x: Math.random() * (canvas.width - 90),
    y: -80,
    w: 90,
    h: 60,
    op: ops[Math.floor(Math.random() * ops.length)],
    used: false,
    counted: false
  });
}

setInterval(() => {
  if (gameState === "RUN" && !paused) spawnGate();
}, 1000);

function spawnCrate() {
  crates.push({
    x: Math.random() * (canvas.width - 90),
    y: -100,
    w: 90,
    h: 60
  });
}

function spawnEnemies() {
  enemies = [];
  const count = Math.floor(Math.random() * 5) + 5 + level * 2;
  for (let i = 0; i < count; i++) {
    enemies.push({
      x: canvas.width / 2 - count * 12 + i * 24,
      y: -40,
      radius: 10
    });
  }
  return count;
}

// ================= UPDATE =================
function updatePlayer() {
  player.x += (touchX - player.x) * 0.15;
}

function applyOperation(op) {
  const v = parseInt(op.slice(1));
  ballCount = op.startsWith("*")
    ? ballCount * v
    : Math.max(1, Math.floor(ballCount / v));
}

let initialPlayerCount = 0;
let initialEnemyCount = 0;

function updateRun() {
  updatePlayer();

  gates.forEach((g, i) => {
    g.y += GATE_SPEED;

    if (!g.used && anyPlayerBallHits(g)) {
      g.used = true;
      applyOperation(g.op);
    }

    if (!g.counted && g.y > player.y) {
      g.counted = true;
      gatesPassed++;
      score += 10;
      scoreEl.textContent = score;

      if (Math.floor(gatesPassed / GATES_PER_CRATE) > cratesSpawned) {
        cratesSpawned++;
        spawnCrate();
      }
    }

    if (g.y > canvas.height + 100) gates.splice(i, 1);
  });

  crates.forEach((c, i) => {
    c.y += GATE_SPEED;
    if (anyPlayerBallHits(c)) {
      gameState = "BATTLE";
      initialPlayerCount = ballCount;
      initialEnemyCount = spawnEnemies();
      crates = [];
    }
    if (c.y > canvas.height + 100) crates.splice(i, 1);
  });
}

function updateBattle() {
  enemies.forEach(e => e.y += ENEMY_SPEED);

  if (clashCooldown) return;

  if (enemies.length === 0 || ballCount === 0) {
    endBattle();
    return;
  }

  if (enemies[0].y + enemies[0].radius >= player.y) {
    clashCooldown = true;

    setTimeout(() => {
      if (ballCount > enemies.length) enemies.shift();
      else if (enemies.length > ballCount) ballCount--;
      else {
        enemies.shift();
        ballCount--;
      }
      clashCooldown = false;
    }, CLASH_DELAY);
  }
}

// ================= END =================
let endText = "";

function endBattle() {
  gameState = "END";

  if (initialPlayerCount > initialEnemyCount) {
    endText = `${initialPlayerCount} > ${initialEnemyCount}\nYOU WIN`;
    level++;
  } else if (initialPlayerCount < initialEnemyCount) {
    endText = `${initialPlayerCount} < ${initialEnemyCount}\nYOU LOSE`;
    level = 1;
  } else {
    endText = `${initialPlayerCount} = ${initialEnemyCount}\nDRAW`;
  }

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("bestScore", bestScore);
    bestEl.textContent = bestScore;
  }

  setTimeout(() => resetGame(false), 2800);
}

function resetGame(fullReset) {
  if (fullReset) level = 1;
  gates = [];
  crates = [];
  enemies = [];
  gatesPassed = 0;
  cratesSpawned = 0;
  ballCount = 1;
  score = 0;
  scoreEl.textContent = 0;
  gameState = "RUN";
  paused = false;
}

// ================= LOOP =================
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!paused) {
    if (gameState === "RUN") updateRun();
    if (gameState === "BATTLE") updateBattle();
  }

  for (let i = 0; i < ballCount; i++) {
    ctx.fillStyle = i === 0 ? "cyan" : "lightgreen";
    ctx.beginPath();
    ctx.arc(player.x + i * 22, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  gates.forEach(g => {
    ctx.fillStyle = g.used ? "#555" : "orange";
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      g.op.replace("*", "×").replace("/", "÷"),
      g.x + g.w / 2,
      g.y + g.h / 2
    );
  });

  crates.forEach(c => {
    ctx.fillStyle = "#555";
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillText("📦", c.x + c.w / 2, c.y + c.h / 2);
  });

  enemies.forEach(e => {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  if (gameState === "END") {
    ctx.fillStyle = "white";
    ctx.font = "32px Arial";
    ctx.textAlign = "center";
    ctx.fillText(endText, canvas.width / 2, canvas.height / 2);
  }

  requestAnimationFrame(loop);
}

loop();
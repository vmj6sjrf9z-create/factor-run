const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// ================= CONFIG =================
const GATE_SPEED = 2.6;
const ENEMY_SPEED = 2.2;
const CLASH_DELAY = 150;
const GATES_PER_CRATE = 5;

// ================= SOUNDS =================
const sounds = {
  multiply: new Audio("sounds/multiply.wav"),
  divide: new Audio("sounds/divide.wav"),
  battle: new Audio("sounds/battle.wav"),
  win: new Audio("sounds/win.wav"),
  lose: new Audio("sounds/lose.wav")
};

Object.values(sounds).forEach(s => s.preload = "auto");

function playSound(s) {
  if (!s) return;
  s.currentTime = 0;
  s.play().catch(() => {});
}

// Mobile audio unlock
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  Object.values(sounds).forEach(s => {
    s.play().then(() => {
      s.pause();
      s.currentTime = 0;
    }).catch(() => {});
  });
}
canvas.addEventListener("touchstart", unlockAudio, { once: true });
canvas.addEventListener("mousedown", unlockAudio, { once: true });

// ================= STATE =================
let level = 1;
let ballCount = 1;
let gatesPassed = 0;
let cratesSpawned = 0;
let gameState = "RUN";
let clashCooldown = false;
let touchX = canvas.width / 2;

// ================= PLAYER =================
const player = {
  x: canvas.width / 2,
  y: canvas.height - 120,
  r: 10
};

// ================= OBJECTS =================
let gates = [];
let crates = [];
let enemies = [];

// ================= INPUT =================
function move(x) {
  touchX = x;
}
canvas.addEventListener("mousemove", e => move(e.clientX));
canvas.addEventListener("touchmove", e => move(e.touches[0].clientX), { passive: true });

// ================= HELPERS =================
function circleRect(cx, cy, r, o) {
  const x = Math.max(o.x, Math.min(cx, o.x + o.w));
  const y = Math.max(o.y, Math.min(cy, o.y + o.h));
  return (cx - x) ** 2 + (cy - y) ** 2 < r ** 2;
}

// ================= SPAWN =================
function spawnGate() {
  const ops = ["*2", "/2", "*3"];
  const op = ops[Math.floor(Math.random() * ops.length)];

  gates.push({
    x: Math.random() * (canvas.width - 100),
    y: -80,
    w: 90,
    h: 60,
    op,
    used: false,
    counted: false
  });
}

setInterval(() => {
  if (gameState === "RUN") spawnGate();
}, 1000);

function spawnCrate() {
  crates.push({
    x: Math.random() * (canvas.width - 90),
    y: -100,
    w: 90,
    h: 60
  });
}

let initialEnemyCount = 0;
let initialPlayerCount = 0;

function spawnEnemies() {
  enemies = [];
  initialEnemyCount = Math.floor(Math.random() * 5) + 5 + level * 2;
  initialPlayerCount = ballCount;

  for (let i = 0; i < initialEnemyCount; i++) {
    enemies.push({
      x: canvas.width / 2 - initialEnemyCount * 12 + i * 24,
      y: -40,
      r: 10
    });
  }
}

// ================= DRAW =================
function drawBall(x, y, r, c) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawGate(g) {
  ctx.fillStyle = g.used ? "#555" : "orange";
  ctx.fillRect(g.x, g.y, g.w, g.h);
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(g.op.replace("*", "×").replace("/", "÷"), g.x + g.w / 2, g.y + g.h / 2);
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Level ${level}`, 20, 30);
  ctx.fillText(`Balls: ${ballCount}`, 20, 55);
}

// ================= LOGIC =================
function applyOperation(op) {
  const v = parseInt(op.slice(1));
  if (op.startsWith("*")) {
    ballCount *= v;
    playSound(sounds.multiply);
  } else {
    ballCount = Math.max(1, Math.floor(ballCount / v));
    playSound(sounds.divide);
  }
}

function updatePlayer() {
  player.x += (touchX - player.x) * 0.18;
}

function updateRun() {
  updatePlayer();

  gates.forEach((g, i) => {
    g.y += GATE_SPEED;

    for (let b = 0; b < ballCount; b++) {
      const bx = player.x + b * 22;
      if (!g.used && circleRect(bx, player.y, player.r, g)) {
        g.used = true;
        applyOperation(g.op);
      }
    }

    if (!g.counted && g.y > player.y) {
      g.counted = true;
      gatesPassed++;
      if (Math.floor(gatesPassed / GATES_PER_CRATE) > cratesSpawned) {
        cratesSpawned++;
        spawnCrate();
      }
    }

    if (g.y > canvas.height + 100) gates.splice(i, 1);
  });

  crates.forEach((c, i) => {
    c.y += GATE_SPEED;

    for (let b = 0; b < ballCount; b++) {
      const bx = player.x + b * 22;
      if (circleRect(bx, player.y, player.r, c)) {
        playSound(sounds.battle);
        gameState = "BATTLE";
        spawnEnemies();
        crates = [];
        return;
      }
    }

    if (c.y > canvas.height + 100) crates.splice(i, 1);
  });
}

let endText = "";

function updateBattle() {
  enemies.forEach(e => e.y += ENEMY_SPEED);

  if (clashCooldown) return;

  if (enemies.length === 0 || ballCount === 0) {
    endBattle();
    return;
  }

  if (enemies[0].y + enemies[0].r >= player.y) {
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

function endBattle() {
  gameState = "END";

  if (initialPlayerCount > initialEnemyCount) {
    endText = `${initialPlayerCount} > ${initialEnemyCount}\nYOU WIN`;
    playSound(sounds.win);
    level++;
  } else if (initialPlayerCount < initialEnemyCount) {
    endText = `${initialPlayerCount} < ${initialEnemyCount}\nYOU LOSE`;
    playSound(sounds.lose);
    level = 1;
  } else {
    endText = `${initialPlayerCount} = ${initialEnemyCount}\nNO WINNER`;
  }

  setTimeout(resetGame, 2800);
}

function resetGame() {
  gates = [];
  crates = [];
  enemies = [];
  gatesPassed = 0;
  cratesSpawned = 0;
  ballCount = 1;
  gameState = "RUN";
}

// ================= LOOP =================
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === "RUN") updateRun();
  if (gameState === "BATTLE") updateBattle();

  for (let i = 0; i < ballCount; i++) {
    drawBall(player.x + i * 22, player.y, player.r, i === 0 ? "cyan" : "lightgreen");
  }

  gates.forEach(drawGate);

  crates.forEach(c => {
    ctx.fillStyle = "#555";
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillText("📦", c.x + c.w / 2, c.y + c.h / 2);
  });

  enemies.forEach(e => drawBall(e.x, e.y, e.r, "red"));

  if (gameState === "END") {
    ctx.fillStyle = "white";
    ctx.font = "32px Arial";
    ctx.textAlign = "center";
    ctx.fillText(endText, canvas.width / 2, canvas.height / 2);
  }

  drawHUD();
  requestAnimationFrame(loop);
}

loop();
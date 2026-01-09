const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

// ================== CONFIG ==================
const GATE_SPEED = 2.5;
const ENEMY_SPEED = 3;
const CLASH_DELAY = 140;
const GATES_PER_CRATE = 5;

// ================== STORAGE ==================
let bestScore = Number(localStorage.getItem("bestScore")) || 0;
let soundEnabled = localStorage.getItem("sound") !== "off";

// ================== AUDIO ==================
const sounds = {
  gate: new Audio("sounds/gate.wav"),
  multiply: new Audio("sounds/multiply.wav"),
  divide: new Audio("sounds/divide.wav"),
  battle: new Audio("sounds/battle.wav"),
  win: new Audio("sounds/win.wav"),
  lose: new Audio("sounds/lose.wav")
};

function play(name) {
  if (soundEnabled && sounds[name]) {
    sounds[name].currentTime = 0;
    sounds[name].play();
  }
}

// ================== STATE ==================
let gameState = "HOME"; // HOME, RUN, PAUSE, BATTLE, END
let level = 1;
let ballCount = 1;
let score = 0;

let gatesPassed = 0;
let cratesSpawned = 0;
let clashCooldown = false;
let touchX = canvas.width / 2;

// ================== PLAYER ==================
const player = {
  x: canvas.width / 2,
  y: canvas.height - 120,
  r: 10
};

// ================== OBJECTS ==================
let gates = [];
let crates = [];
let enemies = [];

// ================== INPUT ==================
canvas.addEventListener("mousemove", e => touchX = e.clientX);
canvas.addEventListener("touchmove", e => touchX = e.touches[0].clientX);

// Tap buttons
canvas.addEventListener("click", handleClick);

// ================== HELPERS ==================
function collide(cx, cy, r, rect) {
  const x = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const y = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  return (cx - x) ** 2 + (cy - y) ** 2 < r ** 2;
}

// ================== SPAWN ==================
function spawnGate() {
  const ops = ["*2", "/2", "*3"];
  gates.push({
    x: Math.random() * (canvas.width - 100),
    y: -80,
    w: 90,
    h: 60,
    op: ops[Math.floor(Math.random() * ops.length)],
    used: false
  });
}

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
  const count = 5 + level * 2;
  for (let i = 0; i < count; i++) {
    enemies.push({
      x: canvas.width / 2 - count * 12 + i * 24,
      y: -40,
      r: 10
    });
  }
  play("battle");
  return count;
}

// ================== LOGIC ==================
function applyOp(op) {
  play(op.startsWith("*") ? "multiply" : "divide");
  const v = parseInt(op.slice(1));
  ballCount = op.startsWith("*")
    ? ballCount * v
    : Math.max(1, Math.floor(ballCount / v));
}

// ================== DRAW ==================
function text(txt, x, y, size = 18, align = "left") {
  ctx.fillStyle = "white";
  ctx.font = `${size}px Arial`;
  ctx.textAlign = align;
  ctx.fillText(txt, x, y);
}

function button(x, y, w, h, label) {
  ctx.fillStyle = "#222";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#555";
  ctx.strokeRect(x, y, w, h);
  text(label, x + w / 2, y + h / 2 + 6, 16, "center");
  return { x, y, w, h };
}

// ================== SCREENS ==================
let buttons = [];

function drawHome() {
  buttons = [];
  text("FACTOR RUN", canvas.width / 2, 120, 40, "center");
  text(`Best Score: ${bestScore}`, canvas.width / 2, 170, 20, "center");

  buttons.push(button(canvas.width / 2 - 80, 240, 160, 50, "START"));
  buttons.push(button(canvas.width / 2 - 80, 310, 160, 50, soundEnabled ? "SOUND: ON" : "SOUND: OFF"));
}

function drawHUD() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, 70);
  text(`Level: ${level}`, 20, 30);
  text(`Balls: ${ballCount}`, 20, 55);
  text(`Score: ${score}`, canvas.width - 20, 30, 18, "right");

  buttons = [];
  buttons.push(button(canvas.width - 120, 40, 50, 25, "⏸"));
  buttons.push(button(canvas.width - 60, 40, 50, 25, "🏠"));
}

function drawPause() {
  text("PAUSED", canvas.width / 2, canvas.height / 2 - 40, 36, "center");
  buttons.push(button(canvas.width / 2 - 80, canvas.height / 2, 160, 50, "RESUME"));
}

function drawEnd(msg) {
  text(msg, canvas.width / 2, canvas.height / 2 - 40, 30, "center");
  buttons.push(button(canvas.width / 2 - 80, canvas.height / 2 + 20, 160, 50, "HOME"));
}

// ================== GAME LOOP ==================
setInterval(() => {
  if (gameState === "RUN") spawnGate();
}, 1000);

function update() {
  if (gameState === "RUN") {
    player.x += (touchX - player.x) * 0.15;

    gates.forEach((g, i) => {
      g.y += GATE_SPEED;

      for (let b = 0; b < ballCount; b++) {
        if (!g.used && collide(player.x + b * 22, player.y, player.r, g)) {
          g.used = true;
          applyOp(g.op);
          score += 10;
        }
      }

      if (g.y > canvas.height) gates.splice(i, 1);
    });

    crates.forEach((c, i) => {
      c.y += GATE_SPEED;
      for (let b = 0; b < ballCount; b++) {
        if (collide(player.x + b * 22, player.y, player.r, c)) {
          gameState = "BATTLE";
          spawnEnemies();
          crates = [];
        }
      }
    });
  }

  if (gameState === "BATTLE" && enemies.length) {
    enemies.forEach(e => e.y += ENEMY_SPEED);
    if (!clashCooldown && enemies[0].y >= player.y) {
      clashCooldown = true;
      setTimeout(() => {
        if (ballCount > enemies.length) enemies.shift();
        else ballCount--;
        clashCooldown = false;
      }, CLASH_DELAY);
    }

    if (!enemies.length || !ballCount) {
      gameState = "END";
      bestScore = Math.max(bestScore, score);
      localStorage.setItem("bestScore", bestScore);
      play(ballCount ? "win" : "lose");
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  buttons = [];

  if (gameState === "HOME") drawHome();
  else {
    drawHUD();

    for (let i = 0; i < ballCount; i++)
      ctx.beginPath(),
      ctx.fillStyle = i ? "lightgreen" : "cyan",
      ctx.arc(player.x + i * 22, player.y, player.r, 0, Math.PI * 2),
      ctx.fill();

    gates.forEach(g => {
      ctx.fillStyle = g.used ? "#555" : "orange";
      ctx.fillRect(g.x, g.y, g.w, g.h);
      text(g.op.replace("*", "×").replace("/", "÷"), g.x + g.w / 2, g.y + g.h / 2 + 6, 20, "center");
    });

    crates.forEach(c => ctx.fillRect(c.x, c.y, c.w, c.h));

    enemies.forEach(e => {
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    });

    if (gameState === "PAUSE") drawPause();
    if (gameState === "END") drawEnd("GAME OVER");
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();

// ================== BUTTON HANDLER ==================
function handleClick(e) {
  const x = e.offsetX, y = e.offsetY;
  buttons.forEach(b => {
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) {
      if (b.label === "START") gameState = "RUN";
      if (b.label === "RESUME") gameState = "RUN";
      if (b.label === "⏸") gameState = "PAUSE";
      if (b.label === "🏠") location.reload();
      if (b.label.includes("SOUND")) {
        soundEnabled = !soundEnabled;
        localStorage.setItem("sound", soundEnabled ? "on" : "off");
      }
    }
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
let gatesPassed = 0;
let cratesSpawned = 0;

let gameState = "RUN";
let clashCooldown = false;

let touchX = canvas.width / 2;

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
function handleMove(x) {
  touchX = x;
}

canvas.addEventListener("mousemove", e => handleMove(e.clientX));
canvas.addEventListener(
  "touchmove",
  e => handleMove(e.touches[0].clientX),
  { passive: true }
);

// ================= HELPERS =================
function circleRectCollide(cx, cy, r, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
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

// ================= DRAW =================
function drawBall(x, y, r, color) {
  ctx.fillStyle = color;
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
  ctx.fillText(
    g.op.replace("*", "×").replace("/", "÷"),
    g.x + g.w / 2,
    g.y + g.h / 2
  );
}

// ✅ FIXED: REAL-TIME HUD
function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Level: ${level}`, 20, 30);
  ctx.fillText(`Balls: ${ballCount}`, 20, 55);
}

// ================= UPDATE =================
function updatePlayer() {
  player.x += (touchX - player.x) * 0.15;
}

function applyOperation(op) {
  const val = parseInt(op.slice(1));
  if (op.startsWith("*")) {
    ballCount *= val;
  } else {
    ballCount = Math.max(1, Math.floor(ballCount / val));
  }
}

// ================= RUN STATE =================
let initialEnemyCount = 0;
let initialPlayerCount = 0;

function updateRun() {
  updatePlayer();

  gates.forEach((g, i) => {
    g.y += GATE_SPEED;

    // ANY BALL can trigger gate
    for (let b = 0; b < ballCount; b++) {
      const bx = player.x + b * 22;
      if (!g.used && circleRectCollide(bx, player.y, player.radius, g)) {
        g.used = true;
        applyOperation(g.op);
        break;
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
      if (circleRectCollide(bx, player.y, player.radius, c)) {
        gameState = "BATTLE";
        initialEnemyCount = spawnEnemies();
        initialPlayerCount = ballCount;
        crates = [];
        break;
      }
    }

    if (c.y > canvas.height + 100) crates.splice(i, 1);
  });
}

// ================= BATTLE =================
function updateBattle() {
  enemies.forEach(e => (e.y += ENEMY_SPEED));

  if (clashCooldown) return;

  if (enemies.length === 0 || ballCount === 0) {
    endBattle();
    return;
  }

  if (enemies[0].y + enemies[0].radius >= player.y) {
    clashCooldown = true;

    setTimeout(() => {
      if (ballCount > enemies.length) {
        enemies.shift();
      } else if (enemies.length > ballCount) {
        ballCount--;
      } else {
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

  // DRAW PLAYER BALLS
  for (let i = 0; i < ballCount; i++) {
    drawBall(
      player.x + i * 22,
      player.y,
      player.radius,
      i === 0 ? "cyan" : "lightgreen"
    );
  }

  gates.forEach(drawGate);

  crates.forEach(c => {
    ctx.fillStyle = "#555";
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = "white";
    ctx.fillText("📦", c.x + c.w / 2, c.y + c.h / 2);
  });

  enemies.forEach(e => drawBall(e.x, e.y, e.radius, "red"));

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
}  
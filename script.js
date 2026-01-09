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
  });
}
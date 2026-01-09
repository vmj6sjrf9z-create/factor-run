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